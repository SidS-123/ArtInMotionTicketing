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
    if (submitButton) {
        submitButton.disabled = !isAvailable;
    }
}

async function handleSignUp(event) {
    event.preventDefault();

    const email = (document.getElementById('email')?.value || '').trim();
    const firstName = (document.getElementById('firstName')?.value || '').trim();
    const lastName = (document.getElementById('lastName')?.value || '').trim();
    const password = document.getElementById('password')?.value || '';

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

        const familyName = lastName.trim();
        const { data: familyRow, error: familyInsertError } = await supabaseClient
            .from(familyTable)
            .insert({
                family_name: familyName,
                status: 'active'
            })
            .select('id')
            .single();

        if (familyInsertError || !familyRow?.id) {
            throw new Error(`Unable to create family: ${familyInsertError?.message || 'Unknown error'}`);
        }

        const userRow = {
            family_account_id: familyRow.id,
            first_name: firstName,
            last_name: lastName,
            email,
            role: defaultRole,
            password_hash: password
        };

        const { data: existingUser, error: userLookupError } = await supabaseClient
            .from(usersTable)
            .select('id')
            .eq('email', email)
            .maybeSingle();

        if (userLookupError) {
            throw new Error(`Account created, but profile lookup failed: ${userLookupError.message}`);
        }

        if (existingUser?.id) {
            const { error: userUpdateError } = await supabaseClient
                .from(usersTable)
                .update(userRow)
                .eq('id', existingUser.id);

            if (userUpdateError) {
                throw new Error(`Account created, but profile update failed: ${userUpdateError.message}`);
            }
        } else {
            const { error: userInsertError } = await supabaseClient
                .from(usersTable)
                .insert(userRow);

            if (userInsertError) {
                throw new Error(`Account created, but profile setup failed: ${userInsertError.message}`);
            }
        }

        form.reset();
        setMessage('Account created and family added.', 'success');
    } catch (err) {
        setMessage(err?.message || 'Could not create account.', 'error');
    } finally {
        setLoading(false);
    }
}

    if (form) {
        form.addEventListener('submit', handleSignUp);
    }

    setFamilyAvailability(true);
})();
