export const ADMIN_COOKIE = "vsphere_admin";

export function getAdminPassword() {
  return process.env.VSPHERE_ADMIN_PASSWORD;
}

export function isAdminCookieValid(cookieValue?: string) {
  const configuredPassword = getAdminPassword();
  return Boolean(configuredPassword && cookieValue === configuredPassword);
}
