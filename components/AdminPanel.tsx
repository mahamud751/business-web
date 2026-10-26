"use client";
import { useState, useEffect, useRef, type FormEvent } from "react";
import Link from "next/link";
import { categories } from "@/lib/catalog.json";
import { transitions } from "@/lib/admin-validation";
import "./admin.css";
type Product = {
  id: string;
  name: string;
  slug: string;
  category: string;
  image: string;
  price: number;
  originalPrice: number;
  stock: number;
  updatedAt: string;
};
type Order = {
  id: string;
  name: string;
  phone: string;
  address: string;
  district: string;
  total: number;
  delivery: number;
  status: string;
  createdAt: string;
  items: {
    id: string;
    productName: string;
    quantity: number;
    price: number;
    product: Product;
  }[];
};
type Summary = {
  products: number;
  orders: number;
  pending: number;
  lowStock: number;
  revenue: number;
  recent: Order[];
};
const money = (n: number) => "৳" + n.toLocaleString("en-BD");
const date = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));
const label = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
async function api(
  path: string,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
) {
  const response = await fetch("/api/admin/" + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || "Request failed") as Error & {
      status: number;
    };
    error.status = response.status;
    throw error;
  }
  return data;
}
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
    };
  }, []);
  return (
    <dialog
      className="admin-dialog"
      ref={ref}
      onCancel={close}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
      aria-label={title}
    >
      <div className="admin-modal-heading">
        <h2>{title}</h2>
        <button type="button" aria-label="Close dialog" onClick={close}>
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
export default function AdminPanel({
  initialEmail,
  unavailable,
}: {
  initialEmail: string | null;
  unavailable: boolean;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [tab, setTab] = useState<"overview" | "products" | "orders">(
    "overview",
  );
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [selected, setSelected] = useState<Order | null>(null);
  const [formError, setFormError] = useState("");
  const [image, setImage] = useState("");
  function handleError(e: unknown) {
    setError(e instanceof Error ? e.message : "Something went wrong");
    if (e && typeof e === "object" && "status" in e && e.status === 401) {
      setEmail(null);
      setSelected(null);
      setEditing(null);
    }
  }
  useEffect(() => {
    if (!email) return;
    const abort = new AbortController();
    setLoading(true);
    setError("");
    const timer = setTimeout(
      () => {
        const path =
          tab === "overview"
            ? "summary"
            : `${tab}?q=${encodeURIComponent(query)}&page=${page}${tab === "orders" && filter ? "&status=" + filter : ""}`;
        api(path, "GET", undefined, abort.signal)
          .then((data) => {
            if (tab === "overview") setSummary(data);
            else {
              if (tab === "products") setProducts(data.rows);
              else setOrders(data.rows);
              setTotal(data.total);
              setPages(data.pages);
            }
          })
          .catch((e) => {
            if (e.name !== "AbortError") handleError(e);
          })
          .finally(() => {
            if (!abort.signal.aborted) setLoading(false);
          });
      },
      query ? 250 : 0,
    );
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [email, tab, query, filter, page, revision]);
  function navigate(next: typeof tab) {
    setTab(next);
    setQuery("");
    setFilter("");
    setPage(1);
    setError("");
    setNotice("");
  }
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(e.currentTarget);
    try {
      const result = await api("login", "POST", {
        email: data.get("email"),
        password: data.get("password"),
      });
      setEmail(result.email);
    } catch (e) {
      handleError(e);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      await api("logout", "POST");
      setEmail(null);
      setSummary(null);
      setProducts([]);
      setOrders([]);
    } catch (e) {
      handleError(e);
    } finally {
      setBusy(false);
    }
  }
  function edit(p: Product | "new") {
    setFormError("");
    setImage(p === "new" ? "" : p.image);
    setEditing(p);
  }
  async function saveProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setFormError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api(
        editing === "new" ? "products" : "products/" + (editing as Product).id,
        editing === "new" ? "POST" : "PATCH",
        {
          ...data,
          price: Number(data.price),
          originalPrice: Number(data.originalPrice),
          stock: Number(data.stock),
          ...(editing !== "new" && editing
            ? { updatedAt: editing.updatedAt }
            : {}),
        },
      );
      setNotice(
        editing === "new"
          ? "Product created. It is now available in the store."
          : "Product updated.",
      );
      setEditing(null);
      setPage(1);
      setRevision((r) => r + 1);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Unable to save");
      if (e && typeof e === "object" && "status" in e && e.status === 401)
        handleError(e);
    } finally {
      setBusy(false);
    }
  }
  async function deleteProduct(p: Product) {
    if (
      !window.confirm(
        `Delete “${p.name}” from the store? Existing order records will be kept.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await api("products/" + p.id, "DELETE");
      setNotice("Product removed from the store. Order history is preserved.");
      setPage(1);
      setRevision((r) => r + 1);
    } catch (e) {
      handleError(e);
    } finally {
      setBusy(false);
    }
  }
  async function updateStatus(status: string) {
    if (!selected) return;
    if (
      status === "CANCELLED" &&
      !window.confirm("Cancel this order and return its items to stock?")
    )
      return;
    setBusy(true);
    setFormError("");
    try {
      await api("orders/" + selected.id, "PATCH", {
        status,
        previousStatus: selected.status,
      });
      setSelected({ ...selected, status });
      setRevision((r) => r + 1);
      setNotice(
        "Order status updated" +
          (status === "CANCELLED" ? " and stock restored." : "."),
      );
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Unable to update");
      if (e && typeof e === "object" && "status" in e && e.status === 401)
        handleError(e);
    } finally {
      setBusy(false);
    }
  }
  function OrderTable({ rows }: { rows: Order[] }) {
    return (
      <div className="admin-table-scroll">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Total</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id}>
                <td>
                  <strong>#{o.id.slice(-8).toUpperCase()}</strong>
                  <small>
                    {o.items.reduce((n, i) => n + i.quantity, 0)} items · Cash
                    on delivery
                  </small>
                </td>
                <td>
                  {o.name}
                  <small>{o.phone}</small>
                </td>
                <td>{date(o.createdAt)}</td>
                <td className="admin-money">{money(o.total)}</td>
                <td>
                  <span className={"admin-status " + o.status.toLowerCase()}>
                    {label(o.status)}
                  </span>
                </td>
                <td>
                  <button
                    className="admin-link"
                    onClick={() => {
                      setSelected(o);
                      setFormError("");
                    }}
                  >
                    View order →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className="admin-empty">No orders found.</div>}
      </div>
    );
  }
  const current = editing && editing !== "new" ? editing : null;
  if (!email)
    return (
      <div className="admin-login">
        <Link href="/" className="admin-login-back">
          ← Back to store
        </Link>
        <div className="admin-login-card">
          <span className="admin-logo">আ</span>
          <span className="admin-eyebrow">APON · STORE MANAGEMENT</span>
          <h1>Welcome back.</h1>
          <p>Sign in to take care of your store.</p>
          {unavailable && (
            <div role="alert" className="admin-error">
              The database is unavailable. Connect PostgreSQL to sign in.
            </div>
          )}
          <form onSubmit={login}>
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="username"
                required
                placeholder="admin@apon.local"
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
            {error && (
              <p className="admin-error" role="alert">
                {error}
              </p>
            )}
            <button className="admin-primary" disabled={busy || unavailable}>
              {busy ? "Signing in…" : "Sign in →"}
            </button>
          </form>
          <small>Private access for store administrators.</small>
        </div>
      </div>
    );
  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
        <Link href="/admin" className="admin-brand">
          <span className="admin-logo">আ</span>
          <span>
            আপন<small>STORE ADMIN</small>
          </span>
        </Link>
        <span className="admin-nav-caption">WORKSPACE</span>
        <nav>
          <button
            className={tab === "overview" ? "active" : ""}
            onClick={() => navigate("overview")}
          >
            <span aria-hidden="true">◫</span> Overview
          </button>
          <button
            className={tab === "products" ? "active" : ""}
            onClick={() => navigate("products")}
          >
            <span aria-hidden="true">▧</span> Products
          </button>
          <button
            className={tab === "orders" ? "active" : ""}
            onClick={() => navigate("orders")}
          >
            <span aria-hidden="true">▤</span> Orders
          </button>
        </nav>
        <div className="admin-sidebar-bottom">
          <Link href="/" target="_blank">
            Open storefront ↗
          </Link>
          <span>{email}</span>
          <button onClick={logout} disabled={busy}>
            Sign out
          </button>
        </div>
      </aside>
      <section className="admin-workspace">
        <header className="admin-topbar">
          <span>
            Workspace <span>/ {label(tab)}</span>
          </span>
          <div>
            <span className="admin-live-dot" /> Store administration{" "}
            <span className="admin-avatar">A</span>
          </div>
        </header>
        <div className="admin-page">
          <div className="admin-page-heading">
            <div>
              <span className="admin-eyebrow">YOUR STORE, AT A GLANCE</span>
              <h1>
                {tab === "overview"
                  ? "A little care. A growing store."
                  : tab === "products"
                    ? "Your product collection"
                    : "Every order, taken care of."}
              </h1>
              <p>
                {tab === "overview"
                  ? "Keep an eye on your products, stock, and customer orders."
                  : tab === "products"
                    ? "Create, edit, and manage what your customers discover."
                    : "Track orders from the first confirmation to the doorstep."}
              </p>
            </div>
            {tab === "products" ? (
              <button className="admin-primary" onClick={() => edit("new")}>
                ＋ Add product
              </button>
            ) : (
              <button
                className="admin-secondary"
                onClick={() => setRevision((r) => r + 1)}
                disabled={loading}
              >
                ↻ Refresh
              </button>
            )}
          </div>
          {error && (
            <div className="admin-error" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="admin-notice" role="status">
              ✓ {notice}
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                ×
              </button>
            </div>
          )}
          {tab === "overview" ? (
            <>
              {summary && (
                <>
                  <div className="admin-stats">
                    {[
                      [
                        "Delivered revenue",
                        money(summary.revenue),
                        "From completed deliveries",
                      ],
                      [
                        "Total orders",
                        summary.orders,
                        `${summary.pending} awaiting confirmation`,
                      ],
                      [
                        "Active products",
                        summary.products,
                        "Available in your catalog",
                      ],
                      [
                        "Low stock",
                        summary.lowStock,
                        "Products with 5 or fewer units",
                      ],
                    ].map(([title, value, hint]) => (
                      <div className="admin-stat" key={title}>
                        <span>{title}</span>
                        <strong>{value}</strong>
                        <small>{hint}</small>
                      </div>
                    ))}
                  </div>
                  <div className="admin-overview-note">
                    <div>
                      <span className="admin-note-icon">✳</span>
                      <div>
                        <h3>
                          {summary.pending
                            ? `${summary.pending} orders are waiting for your attention.`
                            : "You’re all caught up."}
                        </h3>
                        <p>
                          Confirm new orders and help the next little moment of
                          joy arrive.
                        </p>
                      </div>
                    </div>
                    <button
                      className="admin-link"
                      onClick={() => {
                        navigate("orders");
                        setFilter("PENDING");
                      }}
                    >
                      Manage orders →
                    </button>
                  </div>
                  <section className="admin-panel">
                    <div className="admin-panel-heading">
                      <h2>Recent orders</h2>
                      <button
                        className="admin-link"
                        onClick={() => navigate("orders")}
                      >
                        View all orders →
                      </button>
                    </div>
                    <OrderTable rows={summary.recent} />
                  </section>
                </>
              )}
              {loading && (
                <p className="admin-loading" role="status">
                  Loading dashboard…
                </p>
              )}
            </>
          ) : (
            <section className="admin-panel">
              <div className="admin-toolbar">
                <div className="admin-search">
                  <span>⌕</span>
                  <input
                    aria-label={`Search ${tab}`}
                    placeholder={
                      tab === "products"
                        ? "Search by product name or slug…"
                        : "Search by order, customer, or phone…"
                    }
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                {tab === "orders" && (
                  <select
                    aria-label="Filter order status"
                    value={filter}
                    onChange={(e) => {
                      setFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">All statuses</option>
                    {Object.keys(transitions).map((s) => (
                      <option key={s} value={s}>
                        {label(s)}
                      </option>
                    ))}
                  </select>
                )}
                <span className="admin-result-count">
                  {total} {tab}
                </span>
              </div>
              {loading ? (
                <div className="admin-loading" role="status">
                  Loading {tab}…
                </div>
              ) : tab === "products" ? (
                <div className="admin-table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <div className="admin-product-cell">
                              <img
                                src={p.image}
                                alt=""
                                onError={(e) => {
                                  e.currentTarget.style.visibility = "hidden";
                                }}
                              />
                              <div>
                                <strong>{p.name}</strong>
                                <small>/{p.slug}</small>
                              </div>
                            </div>
                          </td>
                          <td>{p.category}</td>
                          <td className="admin-money">
                            {money(p.price)}
                            {p.originalPrice > p.price && (
                              <small>
                                <del>{money(p.originalPrice)}</del>
                              </small>
                            )}
                          </td>
                          <td>
                            <span
                              className={
                                "admin-status " +
                                (p.stock === 0
                                  ? "cancelled"
                                  : p.stock <= 5
                                    ? "pending"
                                    : "delivered")
                              }
                            >
                              {p.stock === 0
                                ? "Out of stock"
                                : `${p.stock} in stock`}
                            </span>
                          </td>
                          <td>
                            <div className="admin-row-actions">
                              <button
                                className="admin-link"
                                onClick={() => edit(p)}
                              >
                                Edit
                              </button>
                              <button
                                className="admin-danger-link"
                                onClick={() => deleteProduct(p)}
                                disabled={busy}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!products.length && (
                    <div className="admin-empty">
                      <h3>No products found</h3>
                      <p>Add a product or try a different search.</p>
                      <button
                        className="admin-primary"
                        onClick={() => edit("new")}
                      >
                        Add product
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <OrderTable rows={orders} />
              )}
              <div className="admin-pagination">
                <span>
                  Page {page} of {pages}
                </span>
                <div>
                  <button
                    className="admin-secondary"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    ← Previous
                  </button>
                  <button
                    className="admin-secondary"
                    disabled={page >= pages || loading}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next →
                  </button>
                </div>
              </div>
            </section>
          )}
          <footer className="admin-page-footer">
            আপন · Made for the everyday moments.<span>All prices in BDT</span>
          </footer>
        </div>
      </section>
      {editing && (
        <Modal
          title={editing === "new" ? "Add a product" : "Edit product"}
          close={() => {
            if (!busy) setEditing(null);
          }}
        >
          <form className="admin-form" onSubmit={saveProduct}>
            <p className="admin-form-intro">
              Product details are published to your storefront when saved.
            </p>
            <label>
              Product name
              <input
                name="name"
                required
                minLength={2}
                maxLength={250}
                defaultValue={current?.name}
                placeholder="Give your product a clear name"
              />
            </label>
            <label>
              URL slug
              <input
                name="slug"
                required
                minLength={2}
                maxLength={160}
                defaultValue={current?.slug}
                placeholder="soft-baby-towel"
              />
              <small>Letters, numbers and hyphens. Must be unique.</small>
            </label>
            <label>
              Category
              <select
                name="category"
                defaultValue={current?.category || categories[0].name}
              >
                {categories.map((c) => (
                  <option key={c.slug}>{c.name}</option>
                ))}
              </select>
            </label>
            <div className="admin-form-grid">
              <label>
                Selling price (৳)
                <input
                  name="price"
                  type="number"
                  min={1}
                  max={10000000}
                  step={1}
                  required
                  defaultValue={current?.price}
                />
              </label>
              <label>
                Original price (৳)
                <input
                  name="originalPrice"
                  type="number"
                  min={0}
                  max={10000000}
                  step={1}
                  required
                  defaultValue={current?.originalPrice || 0}
                />
              </label>
              <label>
                Available stock
                <input
                  name="stock"
                  type="number"
                  min={0}
                  max={1000000}
                  step={1}
                  required
                  defaultValue={current?.stock ?? 0}
                />
              </label>
            </div>
            <label>
              Product image
              <input
                name="image"
                type="text"
                required
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://… or /images/product.webp"
              />
              <small>
                Use an HTTPS image URL or an existing path in the public folder.
              </small>
            </label>
            {image && /^https:\/\/|^\/(?!\/)/.test(image) && (
              <div className="admin-image-preview">
                <img
                  key={image}
                  src={image}
                  alt="Product image preview"
                  onError={(e) => {
                    e.currentTarget.alt = "Image could not be loaded";
                  }}
                />
              </div>
            )}
            {formError && (
              <p className="admin-error" role="alert">
                {formError}
              </p>
            )}
            <div className="admin-form-actions">
              <button
                type="button"
                className="admin-secondary"
                disabled={busy}
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button className="admin-primary" disabled={busy}>
                {busy ? "Saving…" : "Save product"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {selected && (
        <Modal
          title={"Order #" + selected.id.slice(-8).toUpperCase()}
          close={() => {
            if (!busy) setSelected(null);
          }}
        >
          <div className="admin-order-detail">
            <div className="admin-order-meta">
              <span>{date(selected.createdAt)} · Cash on delivery</span>
              <span className={"admin-status " + selected.status.toLowerCase()}>
                {label(selected.status)}
              </span>
            </div>
            <div className="admin-customer">
              <h3>Customer & delivery</h3>
              <strong>{selected.name}</strong>
              <a href={"tel:" + selected.phone}>{selected.phone}</a>
              <p>{selected.address}</p>
              <small>
                {selected.district === "dhaka"
                  ? "Inside Dhaka"
                  : "Outside Dhaka"}
              </small>
            </div>
            <h3>Ordered items</h3>
            {selected.items.map((item) => (
              <div className="admin-order-item" key={item.id}>
                <img src={item.product.image} alt="" />
                <div>
                  <strong>{item.productName || item.product.name}</strong>
                  <small>
                    {item.quantity} × {money(item.price)}
                  </small>
                </div>
                <b>{money(item.price * item.quantity)}</b>
              </div>
            ))}
            <div className="admin-order-totals">
              <p>
                Subtotal{" "}
                <span>{money(selected.total - selected.delivery)}</span>
              </p>
              <p>
                Delivery <span>{money(selected.delivery)}</span>
              </p>
              <p>
                <strong>Total</strong>
                <strong>{money(selected.total)}</strong>
              </p>
            </div>
            <div className="admin-status-actions">
              <h3>Update order</h3>
              <p>Pending → Confirmed → Shipped → Delivered</p>
              {transitions[selected.status]?.length ? (
                <div>
                  {transitions[selected.status].map((status) => (
                    <button
                      key={status}
                      className={
                        status === "CANCELLED"
                          ? "admin-secondary admin-cancel"
                          : "admin-primary"
                      }
                      disabled={busy}
                      onClick={() => updateStatus(status)}
                    >
                      {busy
                        ? "Updating…"
                        : status === "CANCELLED"
                          ? "Cancel order"
                          : `Mark ${label(status)}`}
                    </button>
                  ))}
                </div>
              ) : (
                <p>
                  This order is {selected.status.toLowerCase()} and cannot be
                  changed.
                </p>
              )}
              <small>
                Cancellation is available before shipping and restores the
                ordered stock.
              </small>
            </div>
            {formError && (
              <p className="admin-error" role="alert">
                {formError}
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
