(() => {
    const supabaseConfig = window.SUPABASE_CONFIG || {};
    const supabaseUrl = supabaseConfig.url || '';
    const supabaseAnonKey = supabaseConfig.anonKey || '';

    const supabaseClient = (window.supabase && supabaseUrl && supabaseAnonKey)
        ? window.supabase.createClient(supabaseUrl, supabaseAnonKey)
        : null;

    const signupConfig = window.APP_SIGNUP_CONFIG || {};
    const usersTable = signupConfig.usersTable || 'users';
    const familyTable = signupConfig.familyTable || 'familyaccount';
    const defaultRole = signupConfig.defaultRole || 'user';

    const form = document.getElementById('signupForm');
    const submitButton = form?.querySelector('button[type="submit"]');
    const formMessage = document.getElementById('formMessage');
    const familySelect = document.getElementById('family');
    let signupAvailable = true;

    function setMessage(text, type = '') {
        if (!formMessage) return;
        formMessage.textContent = text;
        formMessage.classList.remove('error', 'success');
        if (type) formMessage.classList.add(type);
    }

    function setLoading(isLoading) {
        if (!submitButton) return;
        submitButton.disabled = isLoading || !signupAvailable;
        submitButton.textContent = isLoading ? 'Creating Account...' : 'Sign Up';
    }

    function setSignupAvailability(isAvailable) {
        signupAvailable = isAvailable;
        if (submitButton) {
            submitButton.disabled = !isAvailable;
        }
    }

    function setFamilySelectionAvailability(isAvailable) {
        if (familySelect) {
            familySelect.disabled = !isAvailable;
        }
    }

    function resetFamilyOptions() {
        if (!familySelect) return;
        familySelect.innerHTML = '';

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Select Existing Family (Optional)';
        placeholder.selected = true;
        familySelect.appendChild(placeholder);
    }

    function isSelectableFamily(row) {
        const status = String(row?.status || '').trim().toLowerCase();
        return !status || status === 'active';
    }

    function isDuplicateEmailError(error) {
        const message = String(error?.message || '').toLowerCase();
        return error?.code === '23505'
            || message.includes('duplicate key')
            || message.includes('already exists')
            || message.includes('unique constraint');
    }

    function showDuplicateEmailPopup() {
        alert('An account with this email already exists. Please log in instead.');
    }

    async function loadFamilyOptions() {
        resetFamilyOptions();

        if (!supabaseClient) {
            setSignupAvailability(false);
            setFamilySelectionAvailability(false);
            setMessage('Sign up is unavailable until Supabase is configured.', 'error');
            return;
        }

        const { data: familyRows, error } = await supabaseClient
            .from(familyTable)
            .select('id, family_name, status')
            .order('family_name', { ascending: true });

        if (error) {
            setSignupAvailability(true);
            setFamilySelectionAvailability(false);
            setMessage(`Could not load families. You can still sign up and a family will be created automatically: ${error.message}`, 'error');
            return;
        }

        const selectableFamilyRows = Array.isArray(familyRows)
            ? familyRows.filter((row) => Number.isInteger(Number(row?.id)) && isSelectableFamily(row))
            : [];

        selectableFamilyRows.forEach((row) => {
            const option = document.createElement('option');
            option.value = String(row.id);
            option.textContent = String(row.family_name || '').trim() || `Family #${row.id}`;
            familySelect?.appendChild(option);
        });

        setSignupAvailability(true);
        setFamilySelectionAvailability(true);
        if (selectableFamilyRows.length === 0) {
            setMessage('No existing families found. Continue signup and we will create one automatically.', '');
            return;
        }
        setMessage('');
    }

    async function handleSignUp(event) {
        event.preventDefault();

        const email = (document.getElementById('email')?.value || '').trim();
        const firstName = (document.getElementById('firstName')?.value || '').trim();
        const lastName = (document.getElementById('lastName')?.value || '').trim();
        const password = document.getElementById('password')?.value || '';
        const selectedFamilyAccountId = Number(familySelect?.value);

        if (!email || !firstName || !lastName || !password) {
            setMessage('Please fill out all fields.', 'error');
            return;
        }

        if (!supabaseClient) {
            setMessage('Signup form is ready. Add Supabase keys in login_page/supabase.config.js to enable account creation.', 'error');
            return;
        }

        try {
            setLoading(true);
            setMessage('');

            const { data: existingUser, error: userLookupError } = await supabaseClient
                .from(usersTable)
                .select('id')
                .eq('email', email)
                .maybeSingle();

            if (userLookupError) {
                throw new Error(`Could not verify email availability: ${userLookupError.message}`);
            }

            if (existingUser?.id) {
                showDuplicateEmailPopup();
                return;
            }

            let familyAccountId = null;
            let createdFamilyAccountId = null;
            if (familySelect?.value && Number.isInteger(selectedFamilyAccountId) && selectedFamilyAccountId > 0) {
                familyAccountId = selectedFamilyAccountId;
            } else {
                const { data: newFamily, error: familyCreateError } = await supabaseClient
                    .from(familyTable)
                    .insert({
                        family_name: lastName
                    })
                    .select('id')
                    .single();

                if (familyCreateError) {
                    throw new Error(`Could not create family for signup: ${familyCreateError.message}`);
                }

                const parsedNewFamilyId = Number(newFamily?.id);
                if (!Number.isInteger(parsedNewFamilyId) || parsedNewFamilyId <= 0) {
                    throw new Error('Family creation returned an invalid ID.');
                }

                familyAccountId = parsedNewFamilyId;
                createdFamilyAccountId = parsedNewFamilyId;
            }

            const userRow = {
                family_account_id: familyAccountId,
                first_name: firstName,
                last_name: lastName,
                email,
                role: defaultRole,
                password_hash: password
            };

            const { error: userInsertError } = await supabaseClient
                .from(usersTable)
                .insert(userRow);

            if (userInsertError) {
                if (createdFamilyAccountId) {
                    await supabaseClient
                        .from(familyTable)
                        .delete()
                        .eq('id', createdFamilyAccountId);
                }

                if (isDuplicateEmailError(userInsertError)) {
                    showDuplicateEmailPopup();
                    return;
                }

                throw new Error(`Account created, but profile setup failed: ${userInsertError.message}`);
            }

            const { error: familyUpdateError } = await supabaseClient
                .from(familyTable)
                .update({ status: 'active' })
                .eq('id', familyAccountId);

            if (familyUpdateError) {
                throw new Error(`Account created, but family activation failed: ${familyUpdateError.message}`);
            }

            form.reset();
            resetFamilyOptions();
            await loadFamilyOptions();
            setMessage(
                createdFamilyAccountId
                    ? 'Account created and linked to your new family.'
                    : 'Account created and linked to the selected family.',
                'success'
            );
        } catch (err) {
            setMessage(err?.message || 'Could not create account.', 'error');
        } finally {
            setLoading(false);
        }
    }

    if (form) {
        form.addEventListener('submit', handleSignUp);
    }

    resetFamilyOptions();
    setSignupAvailability(false);
    setFamilySelectionAvailability(false);
    loadFamilyOptions();
})();
