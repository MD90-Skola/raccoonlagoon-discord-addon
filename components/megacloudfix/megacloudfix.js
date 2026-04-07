// components/megacloudfix/megacloudfix.js

export const template = `
<div class="card">
  <label class="section-label">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
    MegaCloudFix
  </label>

  <div class="toggle-row" style="border-bottom:none; padding-bottom:0;">
    <div class="toggle-info">
      <span class="toggle-label">MegaCloudFix</span>
      <span class="toggle-desc">Redirects megacloud.blog → megacloud.tv (anime video fix)</span>
    </div>
    <label class="toggle-switch">
      <input type="checkbox" id="megaCloudFixEnabled" />
      <span class="slider"></span>
    </label>
  </div>
</div>
`;

export function init() {
  const toggle = document.getElementById('megaCloudFixEnabled');
  if (!toggle) return;

  Storage.get('megaCloudFixEnabled').then(({ megaCloudFixEnabled }) => {
    toggle.checked = megaCloudFixEnabled !== false;
  });

  toggle.addEventListener('change', () => {
    Storage.set({ megaCloudFixEnabled: toggle.checked });
  });
}
