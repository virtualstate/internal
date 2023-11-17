async function productList() {
  const { productList: fn } = await import("./product-list");
  return fn();
}

async function home() {
  const { home: fn } = await import("./home");
  return fn();
}

async function login() {
  const { login: fn } = await import("./login");
  return fn();
}

async function paymentMethodSelect() {
  const { paymentMethodSelect: fn } = await import("./payment-method-select");
  return fn();
}

async function orderConfirmation() {
  const { orderConfirmation: fn } = await import("./order-confirmation");
  return fn();
}

export const paths: Record<string, () => void | Promise<void>> = {
  "/": home,
  "/home": home,
  "/login": login,
  "/order/checkout/confirmation": orderConfirmation,
  "/payment-method/select": paymentMethodSelect,
  "/products": productList
};

export function runPath() {
  const { pathname } = window.location;
  const pathFn = paths[pathname];
  if (!pathFn) return;
  return pathFn();
}
