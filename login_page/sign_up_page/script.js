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
    let familiesAvailable = true;

    function setMessage(text, type = '') {
        if (!formMessage) return;
        formMessage.textContent = text;
        formMessage.classList.remove('error', 'success');
        if (type) formMessage.classList.add(type);
    }

    function setLoading(isLoading) {
        if (!submitButton) return;
        submitButton.disabled = isLoading || !familiesAvailable;
        submitButton.textContent = isLoading ? 'Creating Account...' : 'Sign Up';
    }

    function setFamilyAvailability(isAvailable) {
        familiesAvailable = isAvailable;
        if (familySelect) {
            familySelect.disabled = !isAvailable;
        }
        if (submitButton) {
            submitButton.disabled = !isAvailable;
        }
    }

    function resetFamilyOptions() {
        if (!familySelect) return;
        familySelect.innerHTML = '';

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Select Family';
        placeholder.disabled = true;
        placeholder.selected = true;
        familySelect.appendChild(placeholder);
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
            setFamilyAvailability(false);
            setMessage('Sign up is unavailable until Supabase is configured.', 'error');
            return;
        }

        const { data: familyRows, error } = await supabaseClient
            .from(familyTable)
            .select('id, family_name, status')
            .eq('status', 'active')
            .order('family_name', { ascending: true });

        if (error) {
            setFamilyAvailability(false);
            setMessage(`Could not load families: ${error.message}`, 'error');
            return;
        }

        if (!Array.isArray(familyRows) || familyRows.length === 0) {
            setFamilyAvailability(false);
            setMessage('No active families are available right now.', 'error');
            return;
        }

        familyRows.forEach((row) => {
            const option = document.createElement('option');
            option.value = String(row.id);
            option.textContent = String(row.family_name || '').trim() || `Family #${row.id}`;
            familySelect?.appendChild(option);
        });

        setFamilyAvailability(true);
        setMessage('');
    }

    async function handleSignUp(event) {
        event.preventDefault();

        const email = (document.getElementById('email')?.value || '').trim();
        const firstName = (document.getElementById('firstName')?.value || '').trim();
        const lastName = (document.getElementById('lastName')?.value || '').trim();
        const password = document.getElementById('password')?.value || '';
        const familyAccountId = Number(familySelect?.value);

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

            if (!familySelect?.value) {
                setMessage('Please select a family.', 'error');
                return;
            }

            if (!Number.isInteger(familyAccountId) || familyAccountId <= 0) {
                setMessage('Invalid family selection.', 'error');
                return;
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
            setMessage('Account created and linked to the selected family.', 'success');
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
    setFamilyAvailability(false);
    loadFamilyOptions();
})();
