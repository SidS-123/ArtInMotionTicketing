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

    let familiesAvailable = false;

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

function isSelectableFamily(row) {
    return Number.isInteger(Number(row?.id)) && Number(row?.id) > 0;
}

function resetFamilyOptions() {
    if (!familySelect) return;
    familySelect.innerHTML = '<option value="" selected disabled>Select Family</option>';
}

function renderFamilyOptions(rows) {
    if (!familySelect) return 0;
    resetFamilyOptions();

    let rendered = 0;
    for (const row of rows) {
        const id = Number(row?.id);
        if (!Number.isInteger(id) || id <= 0) continue;
        if (!isSelectableFamily(row)) continue;

        const label = String(row?.family_name || '').trim() || `Family #${id}`;
        const option = document.createElement('option');
        option.value = String(id);
        option.textContent = label;
        familySelect.appendChild(option);
        rendered += 1;
    }

    return rendered;
}

async function loadFamilyOptions() {
    if (!familySelect) return;

    if (!supabaseClient) {
        familySelect.disabled = true;
        setFamilyAvailability(false);
        setMessage('Unable to load families. Add Supabase keys in login_page/supabase.config.js.', 'error');
        return;
    }

    try {
        familySelect.disabled = true;
        setFamilyAvailability(false);

        const { data, error } = await supabaseClient
            .from('familyaccount')
            .select('id, family_name, status')
            .order('family_name', { ascending: true });

        if (error) throw error;

        const rows = Array.isArray(data) ? data : [];
        const count = renderFamilyOptions(rows);

        if (!count) {
            familySelect.disabled = true;
            setFamilyAvailability(false);
            setMessage('No families available. Contact support.', 'error');
            return;
        }

        familySelect.disabled = false;
        setFamilyAvailability(true);
        setMessage('');
    } catch (err) {
        resetFamilyOptions();
        familySelect.disabled = true;
        setFamilyAvailability(false);
        setMessage('Unable to load families. Please try again.', 'error');
    }
}

async function handleSignUp(event) {
    event.preventDefault();

    const email = (document.getElementById('email')?.value || '').trim();
    const firstName = (document.getElementById('firstName')?.value || '').trim();
    const lastName = (document.getElementById('lastName')?.value || '').trim();
    const password = document.getElementById('password')?.value || '';
    const family = familySelect?.value || '';
    const familyAccountId = Number(family);

    if (!email || !firstName || !lastName || !password || !family) {
        setMessage('Please fill out all fields.', 'error');
        return;
    }

    if (!Number.isInteger(familyAccountId) || familyAccountId <= 0) {
        setMessage('Invalid family selection.', 'error');
        return;
    }

    if (!supabaseClient) {
        setMessage('Signup form is ready. Add Supabase keys in login_page/supabase.config.js to enable account creation.', 'error');
        return;
    }

    try {
        setLoading(true);
        setMessage('');

        const userRow = {
            family_account_id: familyAccountId,
            first_name: firstName,
            last_name: lastName,
            email,
            role: defaultRole,
            password_hash: password
        };

        const { error: userWriteError } = await supabaseClient
            .from(usersTable)
            .upsert(userRow, { onConflict: 'email' });

        if (userWriteError) {
            throw new Error(`Account created, but profile setup failed: ${userWriteError.message}`);
        }

        const { data: activatedRows, error: familyUpdateError } = await supabaseClient
            .from(familyTable)
            .update({ status: 'active' })
            .eq('id', familyAccountId)
            .select('id')
            .limit(1);

        if (familyUpdateError) {
            throw new Error(`Account created, but family activation failed: ${familyUpdateError.message}`);
        }

        if (!Array.isArray(activatedRows) || activatedRows.length === 0) {
            throw new Error('Selected family no longer exists. Refresh and try again.');
        }

        form.reset();
        setMessage('Account created and family activated.', 'success');
    } catch (err) {
        setMessage(err?.message || 'Could not create account.', 'error');
    } finally {
        setLoading(false);
    }
}

    if (form) {
        form.addEventListener('submit', handleSignUp);
    }

    loadFamilyOptions();
})();
