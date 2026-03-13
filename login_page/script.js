function switchRole(role) {
    const userForm = document.getElementById('userForm');
    const adminForm = document.getElementById('adminForm');
    const signupForm = document.getElementById('signupForm');
    const userTab = document.getElementById('userTab');
    const adminTab = document.getElementById('adminTab');
    const signupTab = document.getElementById('signupTab');

    const forms = { user: userForm, admin: adminForm, signup: signupForm };
    const tabs = { user: userTab, admin: adminTab, signup: signupTab };

    Object.values(forms).forEach((form) => {
        if (form) form.style.display = 'none';
    });
    Object.values(tabs).forEach((tab) => {
        if (tab) tab.classList.remove('active');
    });

    const targetForm = forms[role] || userForm;
    const targetTab = tabs[role] || userTab;

    if (targetForm) targetForm.style.display = 'block';
    if (targetTab) targetTab.classList.add('active');
}

const appConfig = window.APP_LOGIN_CONFIG || {};
const supabaseConfig = window.SUPABASE_CONFIG || {};

const supabaseUrl = supabaseConfig.url || '';
const supabaseAnonKey = supabaseConfig.anonKey || '';
const supabaseClient = (window.supabase && supabaseUrl && supabaseAnonKey)
    ? window.supabase.createClient(supabaseUrl, supabaseAnonKey)
    : null;

const roleValue = (appConfig.userRoleValue || 'user').toLowerCase();
const adminRoleValue = (appConfig.adminRoleValue || 'admin').toLowerCase();
const userRedirectPath = appConfig.userRedirectPath || '../user_page/index.html';
const demoRedirectPath = appConfig.demoRedirectPath || 'demo.html';
const adminRedirectPath = appConfig.adminRedirectPath || '../Admin/admin-home.html';

const tableNames = {
    users: appConfig.usersTable || 'users',
    userSession: appConfig.userSessionTable || 'usersession',
    auditLog: appConfig.auditLogTable || 'auditlog',
    familyAccount: appConfig.familyAccountTable || 'familyaccount',
    usersAuthTable: appConfig.usersAuthTable || 'users'
};

const columnCandidates = {
    users: {
        id: appConfig.usersIdColumns || ['id', 'userid', 'user_id'],
        authId: appConfig.usersAuthIdColumns || ['auth_user_id', 'authuserid', 'auth_id', 'supabase_auth_id'],
        email: appConfig.usersEmailColumns || ['email', 'useremail', 'username'],
        role: appConfig.usersRoleColumns || ['role', 'usertype', 'user_role'],
        active: appConfig.usersActiveColumns || ['is_active', 'active', 'enabled', 'isenabled'],
        lastLoginAt: appConfig.usersLastLoginAtColumns || ['last_login_at', 'lastloginat', 'last_login'],
        lastLoginIp: appConfig.usersLastLoginIpColumns || ['last_login_ip', 'lastloginip']
    },
    sessions: {
        userId: appConfig.sessionUserIdColumns || ['user_id', 'userid', 'userid_fk'],
        loginAt: appConfig.sessionLoginAtColumns || ['login_at', 'logintime', 'created_at'],
        status: appConfig.sessionStatusColumns || ['status', 'session_status'],
        ipAddress: appConfig.sessionIpColumns || ['ip_address', 'ipaddress'],
        userAgent: appConfig.sessionUserAgentColumns || ['user_agent', 'useragent'],
        deviceInfo: appConfig.sessionDeviceColumns || ['device_info', 'device', 'deviceinfo'],
        logoutAt: appConfig.sessionLogoutAtColumns || ['logout_at', 'logouttime', 'ended_at']
    },
    audit: {
        eventType: appConfig.auditEventTypeColumns || ['event_type', 'eventtype', 'action', 'event'],
        userId: appConfig.auditUserIdColumns || ['user_id', 'userid'],
        userIdentifier: appConfig.auditUserIdentifierColumns || ['user_identifier', 'identifier', 'username', 'email'],
        reason: appConfig.auditReasonColumns || ['reason', 'message', 'details', 'description'],
        occurredAt: appConfig.auditOccurredAtColumns || ['occurred_at', 'event_at', 'created_at', 'timestamp'],
        sessionId: appConfig.auditSessionIdColumns || ['session_id', 'usersession_id', 'sessionid']
    },
    family: {
        username: appConfig.familyUsernameColumns || ['email', 'username', 'user_name', 'login', 'family_name', 'primary_phone'],
        password: appConfig.familyPasswordColumns || ['password', 'pass', 'password_hash', 'pin', 'primary_phone']
    },
    usersAuth: {
        email: appConfig.usersAuthEmailColumns || ['email', 'useremail', 'username'],
        password: appConfig.usersAuthPasswordColumns || ['password_hash', 'password', 'pass']
    }
};

const userState = {
    isSubmitting: false,
    activeSession: null
};

function normalize(value) {
    return String(value || '').trim().toLowerCase();
}

function findColumnName(row, candidates) {
    if (!row || typeof row !== 'object') return null;
    const keys = Object.keys(row);
    for (const candidate of candidates) {
        const wanted = normalize(candidate);
        const found = keys.find((k) => normalize(k) === wanted);
        if (found) return found;
    }
    return null;
}

function setButtonLoading(button, loading, loadingText) {
    if (!button) return;
    if (!button.dataset.defaultText) {
        button.dataset.defaultText = button.textContent || '';
    }
    button.disabled = loading;
    button.textContent = loading ? loadingText : button.dataset.defaultText;
}

async function authenticateUser(email, password) {
    if (!supabaseClient) {
        throw new Error('Supabase is not configured. Add keys in login_page/supabase.config.js');
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('No authenticated user returned.');
    return data.user;
}

async function authenticateUsersTable(identifier, password, requiredRole = '') {
    if (!supabaseClient) {
        throw new Error('Supabase is not configured. Add keys in login_page/supabase.config.js');
    }

    const table = tableNames.usersAuthTable;

    const { data: sampleRows, error: sampleError } = await supabaseClient
        .from(table)
        .select('*')
        .limit(20);

    if (sampleError) {
        throw new Error(`Unable to query ${table}: ${sampleError.message}`);
    }

    const rows = Array.isArray(sampleRows) ? sampleRows : [];
    const sampleRow = rows[0] || null;

    if (!sampleRow) {
        throw new Error('No users found.');
    }

    const emailCol = findColumnName(sampleRow, columnCandidates.usersAuth.email);
    const passwordCol = findColumnName(sampleRow, columnCandidates.usersAuth.password);
    const roleCol = findColumnName(sampleRow, columnCandidates.users.role);

    if (!emailCol || !passwordCol) {
        throw new Error('User login columns not found. Configure APP_LOGIN_CONFIG usersAuthEmailColumns/usersAuthPasswordColumns.');
    }
    if (requiredRole && !roleCol) {
        throw new Error('User role column not found. Configure APP_LOGIN_CONFIG usersRoleColumns.');
    }

    let query = supabaseClient
        .from(table)
        .select('*')
        .eq(emailCol, identifier);

    if (requiredRole && roleCol) {
        query = query.eq(roleCol, requiredRole);
    }

    const { data: matchRows, error: matchError } = await query.limit(1);

    if (matchError) {
        throw new Error(`Unable to read ${table}: ${matchError.message}`);
    }

    const matched = Array.isArray(matchRows) ? matchRows[0] : null;
    if (requiredRole && roleCol) {
        const matchedRole = normalize(matched[roleCol]);
        if (matchedRole !== normalize(requiredRole)) {
            throw new Error('This account is not authorized for admin login.');
        }
    }

    const storedPassword = matched[passwordCol];
    if (String(storedPassword ?? '') !== String(password)) {
        throw new Error('Invalid email or password.');
    }

    return matched;
}

async function getAppUser(authUserId, email) {
    const table = tableNames.users;

    // Fetch a small sample so we can dynamically map actual column names.
    const { data: sampleRows, error: sampleError } = await supabaseClient
        .from(table)
        .select('*')
        .limit(20);

    if (sampleError) {
        throw new Error(`Unable to query ${table}: ${sampleError.message}`);
    }

    const rows = Array.isArray(sampleRows) ? sampleRows : [];
    let matched = null;

    for (const row of rows) {
        const authIdCol = findColumnName(row, columnCandidates.users.authId);
        const emailCol = findColumnName(row, columnCandidates.users.email);

        const rowAuthId = authIdCol ? String(row[authIdCol] || '') : '';
        const rowEmail = emailCol ? String(row[emailCol] || '') : '';

        if (rowAuthId && rowAuthId === authUserId) {
            matched = row;
            break;
        }
        if (!matched && rowEmail && normalize(rowEmail) === normalize(email)) {
            matched = row;
        }
    }

    if (!matched) {
        throw new Error('No matching app user found in users table.');
    }

    const roleCol = findColumnName(matched, columnCandidates.users.role);
    const activeCol = findColumnName(matched, columnCandidates.users.active);
    const idCol = findColumnName(matched, columnCandidates.users.id);

    const role = roleCol ? normalize(matched[roleCol]) : '';
    const activeValue = activeCol ? matched[activeCol] : true;
    const isActive = activeValue === true || activeValue === 1 || normalize(activeValue) === 'true' || normalize(activeValue) === '1';

    if (role && role !== roleValue) {
        throw new Error('This account is not authorized for user login.');
    }
    if (!isActive) {
        throw new Error('This account is disabled.');
    }
    if (!idCol || !matched[idCol]) {
        throw new Error('Could not resolve app user id.');
    }

    return {
        row: matched,
        idColumn: idCol,
        idValue: matched[idCol],
        roleColumn: roleCol
    };
}

function makePayloadFromRowShape(sampleRow, candidatesToValues) {
    const payload = {};
    for (const [candidates, value] of candidatesToValues) {
        const col = findColumnName(sampleRow, candidates);
        if (col && value !== undefined) {
            payload[col] = value;
        }
    }
    return payload;
}

async function writeAuditLog(event) {
    const table = tableNames.auditLog;
    const { data: rows, error: readErr } = await supabaseClient
        .from(table)
        .select('*')
        .limit(1);

    if (readErr) {
        throw new Error(`Unable to read ${table}: ${readErr.message}`);
    }

    const shape = (Array.isArray(rows) && rows[0]) ? rows[0] : {};
    const payload = makePayloadFromRowShape(shape, [
        [columnCandidates.audit.eventType, event.eventType],
        [columnCandidates.audit.userId, event.userId],
        [columnCandidates.audit.userIdentifier, event.userIdentifier],
        [columnCandidates.audit.reason, event.reason],
        [columnCandidates.audit.occurredAt, new Date().toISOString()],
        [columnCandidates.audit.sessionId, event.sessionId]
    ]);

    const { data: inserted, error: insertErr } = await supabaseClient
        .from(table)
        .insert(payload)
        .select('*')
        .limit(1);

    if (insertErr) {
        throw new Error(`Unable to write ${table}: ${insertErr.message}`);
    }

    return Array.isArray(inserted) ? inserted[0] : null;
}

async function createUserSession(appUser) {
    const table = tableNames.userSession;
    const { data: rows, error: readErr } = await supabaseClient
        .from(table)
        .select('*')
        .limit(1);

    if (readErr) {
        throw new Error(`Unable to read ${table}: ${readErr.message}`);
    }

    const shape = (Array.isArray(rows) && rows[0]) ? rows[0] : {};
    const payload = makePayloadFromRowShape(shape, [
        [columnCandidates.sessions.userId, appUser.idValue],
        [columnCandidates.sessions.loginAt, new Date().toISOString()],
        [columnCandidates.sessions.status, 'active'],
        [columnCandidates.sessions.ipAddress, null],
        [columnCandidates.sessions.userAgent, navigator.userAgent || 'browser'],
        [columnCandidates.sessions.deviceInfo, navigator.platform || 'unknown']
    ]);

    // Duplicate-submit guard: if an active session already exists for this user in this table,
    // reuse it instead of creating another row.
    const userIdCol = findColumnName(shape, columnCandidates.sessions.userId);
    const statusCol = findColumnName(shape, columnCandidates.sessions.status);
    if (userIdCol && statusCol) {
        const { data: existing } = await supabaseClient
            .from(table)
            .select('*')
            .eq(userIdCol, appUser.idValue)
            .eq(statusCol, 'active')
            .limit(1);

        if (Array.isArray(existing) && existing.length > 0) {
            userState.activeSession = existing[0];
            return existing[0];
        }
    }

    const { data: inserted, error: insertErr } = await supabaseClient
        .from(table)
        .insert(payload)
        .select('*')
        .limit(1);

    if (insertErr) {
        throw new Error(`Unable to create ${table} record: ${insertErr.message}`);
    }

    const sessionRow = Array.isArray(inserted) ? inserted[0] : null;
    userState.activeSession = sessionRow;
    return sessionRow;
}

async function updateUserLastLogin(appUser) {
    const table = tableNames.users;
    const row = appUser.row;
    const idCol = appUser.idColumn;
    const lastLoginAtCol = findColumnName(row, columnCandidates.users.lastLoginAt);
    const lastLoginIpCol = findColumnName(row, columnCandidates.users.lastLoginIp);

    const updates = {};
    if (lastLoginAtCol) updates[lastLoginAtCol] = new Date().toISOString();
    if (lastLoginIpCol) updates[lastLoginIpCol] = null;

    if (Object.keys(updates).length === 0) return;

    const { error } = await supabaseClient
        .from(table)
        .update(updates)
        .eq(idCol, appUser.idValue);

    if (error) {
        throw new Error(`Failed to update users last-login fields: ${error.message}`);
    }
}

function getSessionId(sessionRow) {
    if (!sessionRow || typeof sessionRow !== 'object') return null;
    const idCol = findColumnName(sessionRow, ['id', 'session_id', 'usersessionid']);
    return idCol ? sessionRow[idCol] : null;
}

async function finalizeLoginRoute(role) {
    if (role !== roleValue) {
        throw new Error('Role mismatch for user portal route.');
    }
    window.location.href = userRedirectPath;
}

async function endUserSession(reason) {
    if (!supabaseClient || !userState.activeSession) return;
    const table = tableNames.userSession;
    const sessionRow = userState.activeSession;
    const idCol = findColumnName(sessionRow, ['id', 'session_id', 'usersessionid']);
    const logoutAtCol = findColumnName(sessionRow, columnCandidates.sessions.logoutAt);
    const statusCol = findColumnName(sessionRow, columnCandidates.sessions.status);

    if (!idCol) return;

    const updates = {};
    if (logoutAtCol) updates[logoutAtCol] = new Date().toISOString();
    if (statusCol) updates[statusCol] = 'ended';

    if (Object.keys(updates).length > 0) {
        await supabaseClient
            .from(table)
            .update(updates)
            .eq(idCol, sessionRow[idCol]);
    }

    const userIdCol = findColumnName(sessionRow, columnCandidates.sessions.userId);
    await writeAuditLog({
        eventType: reason === 'expired' ? 'session_expired' : 'logout_success',
        userId: userIdCol ? sessionRow[userIdCol] : null,
        userIdentifier: null,
        reason: reason,
        sessionId: sessionRow[idCol]
    }).catch(() => {});
}

async function handleUserLoginSubmit(e) {
    e.preventDefault();

    if (userState.isSubmitting) return;
    userState.isSubmitting = true;

    const form = e.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');
    setButtonLoading(submitButton, true, 'Signing In...');

    const usernameInput = form.querySelector('input[name="email"]');
    const passwordInput = form.querySelector('input[name="password"]');
    const email = String(usernameInput.value || '').trim();
    const password = String(passwordInput.value || '');

    try {
        await authenticateUsersTable(email, password, '');
        await finalizeLoginRoute(roleValue);
    } catch (err) {
        alert('Username or password incorrect');
    } finally {
        userState.isSubmitting = false;
        setButtonLoading(submitButton, false, 'Signing In...');
    }
}

function handleAdminSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');
    setButtonLoading(submitButton, true, 'Signing In...');

    const usernameInput = form.querySelector('input[name="username"]');
    const passwordInput = form.querySelector('input[name="password"]');
    const username = String(usernameInput.value || '').trim();
    const password = String(passwordInput.value || '');

    authenticateUsersTable(username, password, adminRoleValue)
        .then(() => {
            window.location.href = adminRedirectPath;
        })
        .catch((err) => {
            alert('Username or password incorrect');
        })
        .finally(() => {
            setButtonLoading(submitButton, false, 'Signing In...');
        });
}

function initializeSessionLifecycleHooks() {
    if (!supabaseClient) return;

    supabaseClient.auth.onAuthStateChange(async (event) => {
        if (event === 'SIGNED_OUT') {
            await endUserSession('logout');
        }
    });
}

document.getElementById('userForm').addEventListener('submit', handleUserLoginSubmit);
document.getElementById('adminForm').addEventListener('submit', handleAdminSubmit);
initializeSessionLifecycleHooks();

window.userLoginIntegration = {
    endUserSession
};
