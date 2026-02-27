window.SUPABASE_CONFIG = {
    url: 'PASTE_SUPABASE_URL_HERE',
    anonKey: 'PASTE_SUPABASE_ANON_KEY_HERE'
};

window.APP_LOGIN_CONFIG = {
    // Scope boundary: only user login is integrated; admin flow stays unchanged.
    userRoleValue: 'user',
    userRedirectPath: '../user_page/index.html',

    // Tables discovered from DATABASE_INFO.md
    usersTable: 'users',
    userSessionTable: 'usersession',
    auditLogTable: 'auditlog',

    // Optional: customize these if your actual column names differ.
    usersIdColumns: ['id'],
    usersAuthIdColumns: [],
    usersEmailColumns: ['email'],
    usersRoleColumns: ['role'],
    usersActiveColumns: [],
    usersLastLoginAtColumns: [],
    usersLastLoginIpColumns: [],

    sessionUserIdColumns: ['user_id'],
    sessionLoginAtColumns: ['login_at'],
    sessionStatusColumns: [],
    sessionIpColumns: ['ip_address'],
    sessionUserAgentColumns: ['user_agent'],
    sessionDeviceColumns: [],
    sessionLogoutAtColumns: ['logout_at'],

    auditEventTypeColumns: ['action_type'],
    auditUserIdColumns: ['user_id'],
    auditUserIdentifierColumns: [],
    auditReasonColumns: ['new_values'],
    auditOccurredAtColumns: ['created_at'],
    auditSessionIdColumns: ['record_id']
};
