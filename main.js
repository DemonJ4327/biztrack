// main.js - 全局公共逻辑
document.addEventListener("DOMContentLoaded", function() {
    const banner = document.getElementById('cookie-banner');
    const acceptBtn = document.getElementById('accept-cookies');
    const declineBtn = document.getElementById('decline-cookies');

    // 安全检查：只有当当前页面存在横幅元素时，才执行后续逻辑
    if (banner && acceptBtn && declineBtn) {
        if (!localStorage.getItem('cookieConsent')) {
            banner.style.display = 'block'; 
        }

        acceptBtn.addEventListener('click', function() {
            localStorage.setItem('cookieConsent', 'accepted'); 
            banner.style.display = 'none'; 
        });

        declineBtn.addEventListener('click', function() {
            localStorage.setItem('cookieConsent', 'declined'); 
            banner.style.display = 'none'; 
        });
    }
});