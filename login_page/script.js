function switchRole(role) {
    const userForm = document.getElementById('userForm');
    const adminForm = document.getElementById('adminForm');
    const userTab = document.getElementById('userTab');
    const adminTab = document.getElementById('adminTab');

    if (role === 'admin') {
        userForm.style.display = 'none';
        adminForm.style.display = 'block';
        adminTab.classList.add('active');
        userTab.classList.remove('active');
    } else {
        adminForm.style.display = 'none';
        userForm.style.display = 'block';
        userTab.classList.add('active');
        adminTab.classList.remove('active');
    }
}

// Optional: Prevent default form submission for demo purposes
document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const role = form.id === 'adminForm' ? 'Admin' : 'User';
        console.log(`${role} login attempted.`);
        alert(`${role} login logic would trigger here.`);
    });
});