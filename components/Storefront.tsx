"use client";
import { useState, useEffect, useRef, useMemo, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FamilyHome, { FamilyHeader, FamilyFooter } from "./FamilyHome";
import Icon from "./icons";
import { categories } from "@/lib/catalog.json";
type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  image: string;
  price: number;
  originalPrice: number;
  stock: number;
};
type Cart = Record<string, number>;
const money = (n: number) => "৳" + n.toLocaleString("bn-BD");
const discount = (p: Product) =>
  p.originalPrice > p.price
    ? Math.round((1 - p.price / p.originalPrice) * 100)
    : 0;
const policies: Record<string, string> = {
  delivery: "ডেলিভারি নীতি",
  "returns-refunds": "রিটার্ন ও রিফান্ড নীতি",
  privacy: "প্রাইভেসি পলিসি",
  terms: "ব্যবহারের শর্তাবলি",
};
function Price({ p, large }: { p: Product; large?: boolean }) {
  return (
    <span className={large ? "price price--lg" : "price"}>
      <b>{money(p.price)}</b>
      {p.originalPrice > p.price && <del>{money(p.originalPrice)}</del>}
    </span>
  );
}
function ProductCard({ p, onAdd }: { p: Product; onAdd: () => void }) {
  const off = discount(p);
  return (
    <article className="product-card">
      <Link className="product-media" href={"/product/" + p.slug}>
        <img src={p.image} alt={p.name} loading="lazy" />
        {p.stock < 1 ? (
          <span className="badge badge--muted">স্টকে নেই</span>
        ) : (
          off > 0 && (
            <span className="badge">{off.toLocaleString("bn-BD")}% ছাড়</span>
          )
        )}
      </Link>
      <div className="product-body">
        <span className="product-category">{p.category}</span>
        <h3>
          <Link href={"/product/" + p.slug}>{p.name}</Link>
        </h3>
        <div className="product-foot">
          <Price p={p} />
          <button
            className="quick-add"
            aria-label={p.name + " কার্টে যোগ করুন"}
            onClick={onAdd}
            disabled={!p.stock}
          >
            <Icon name="plus" size={20} />
          </button>
        </div>
      </div>
    </article>
  );
}
export default function Storefront({
  products,
  path,
}: {
  products: Product[];
  path: string[];
}) {
  const router = useRouter();
  const [cart, setCart] = useState<Cart>({});
  const [loaded, setLoaded] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [menu, setMenu] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("default");
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState("");
  const [district, setDistrict] = useState("dhaka");
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    try {
      const c = JSON.parse(localStorage.getItem("tuhfa-cart") || "{}");
      if (c && typeof c === "object")
        setCart(
          Object.fromEntries(
            Object.entries(c).filter(
              ([id, n]) =>
                products.some((p) => p.id === id) &&
                Number.isInteger(n) &&
                Number(n) > 0 &&
                Number(n) <= 20,
            ),
          ) as Cart,
        );
    } catch {}
    setLoaded(true);
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setQuery(q);
  }, [products]);
  useEffect(() => {
    if (loaded) localStorage.setItem("tuhfa-cart", JSON.stringify(cart));
  }, [cart, loaded]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (drawer) {
      dialog.current?.showModal();
      document.body.style.overflow = "hidden";
    } else {
      dialog.current?.close();
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawer]);
  const items = products.filter((p) => cart[p.id]);
  const count = items.reduce((n, p) => n + cart[p.id], 0);
  const subtotal = items.reduce((n, p) => n + p.price * cart[p.id], 0);
  const delivery =
    count >= 4 || (district === "dhaka" && subtotal >= 2000)
      ? 0
      : district === "dhaka"
        ? 80
        : 130;
  function add(p: Product) {
    if (p.stock < 1) return;
    setCart((c) => ({
      ...c,
      [p.id]: Math.min((c[p.id] || 0) + 1, 20, p.stock),
    }));
    setToast("পণ্যটি কার্টে যোগ হয়েছে");
  }
  function change(id: string, delta: number) {
    setCart((c) => {
      const next = { ...c };
      next[id] = Math.min(
        20,
        products.find((p) => p.id === id)?.stock || 0,
        (next[id] || 0) + delta,
      );
      if (next[id] <= 0) delete next[id];
      return next;
    });
  }
  function search(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q")?.toString() || "";
    setQuery(q);
    setMenu(false);
    router.push("/shop?q=" + encodeURIComponent(q));
  }
  const card = (p: Product) => (
    <ProductCard key={p.id} p={p} onAdd={() => add(p)} />
  );
  const isHome = path.length === 0;
  const product =
    path[0] === "product"
      ? products.find((p) => p.slug === decodeURIComponent(path[1]))
      : undefined;
  const category = categories.find((c) => c.slug === path[1]);
  const title =
    category?.name || (path[0] === "collections" ? "বিশেষ কালেকশন" : "সব পণ্য");
  const filtered = useMemo(
    () =>
      products
        .filter(
          (p) =>
            (!category ||
              category.slug === "viral-products" ||
              p.category === category.name) &&
            (!query ||
              p.name.toLowerCase().includes(query.toLowerCase()) ||
              p.category.includes(query)),
        )
        .sort((a, b) =>
          sort === "low"
            ? a.price - b.price
            : sort === "high"
              ? b.price - a.price
              : 0,
        ),
    [products, category, query, sort],
  );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          phone: form.get("phone"),
          address: form.get("address"),
          district,
          items: items.map((p) => ({ id: p.id, quantity: cart[p.id] })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrder(data.id);
      setCart({});
      setCheckout(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "অর্ডার করা যায়নি।");
    } finally {
      setBusy(false);
    }
  }
  const productCategory = product
    ? categories.find((c) => c.name === product.category)
    : undefined;
  const crumbs: [string, string][] = product
    ? [
        ["/shop", "শপ"],
        ...(productCategory
          ? [["/categories/" + productCategory.slug, productCategory.name] as [
              string,
              string,
            ]]
          : []),
      ]
    : [["/shop", "শপ"]];
  return (
    <>
      <FamilyHeader
        count={count}
        menu={menu}
        onMenu={() => setMenu(!menu)}
        onCart={() => {
          setDrawer(true);
          setCheckout(false);
          setMenu(false);
        }}
        search={search}
      />
      <main>
        {isHome ? (
          <FamilyHome
            featured={products
              .filter((p) => p.category === "খেলনা ও লার্নিং")
              .slice(0, 4)
              .map(card)}
            baby={products
              .filter((p) => p.category === "মা ও শিশুর যত্ন")
              .slice(0, 4)
              .map(card)}
          />
        ) : (
          <div className="container inner-page">
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <Link href="/">হোম</Link>
              {crumbs.map(([href, label]) => (
                <span key={href}>
                  <Icon name="chevron" size={14} />
                  <Link href={href}>{label}</Link>
                </span>
              ))}
              <span>
                <Icon name="chevron" size={14} />
                <span aria-current="page">
                  {product?.name ||
                    (path[0] === "policies"
                      ? policies[path[1]] || "নীতিমালা"
                      : title)}
                </span>
              </span>
            </nav>
            {product ? (
              <>
                <div className="detail-grid">
                  <div className="detail-media">
                    <img src={product.image} alt={product.name} />
                    {discount(product) > 0 && (
                      <span className="badge">
                        {discount(product).toLocaleString("bn-BD")}% ছাড়
                      </span>
                    )}
                  </div>
                  <div className="detail-info">
                    <span className="eyebrow">{product.category}</span>
                    <h1>{product.name}</h1>
                    <Price p={product} large />
                    <span
                      className={
                        product.stock > 0 ? "stock" : "stock stock--out"
                      }
                    >
                      <span className="stock-dot" />
                      {product.stock > 0 ? "স্টকে আছে" : "স্টকে নেই"}
                    </span>
                    <p className="detail-copy">
                      পরিবারের জন্য বাছাই করা পণ্য। সারাদেশে হোম ডেলিভারি এবং
                      ক্যাশ অন ডেলিভারি সুবিধা।
                    </p>
                    <div className="detail-actions">
                      <button
                        className="btn btn-primary btn-lg"
                        disabled={!product.stock}
                        onClick={() => add(product)}
                      >
                        <Icon name="bag" size={20} /> কার্টে যোগ করুন
                      </button>
                      <button
                        className="btn btn-outline btn-lg"
                        disabled={!product.stock}
                        onClick={() => {
                          add(product);
                          setDrawer(true);
                          setCheckout(true);
                        }}
                      >
                        এখনই কিনুন
                      </button>
                    </div>
                    <ul className="perks">
                      <li>
                        <Icon name="truck" size={20} />
                        <span>
                          <b>হোম ডেলিভারি</b>
                          ঢাকায় ৳৮০ · ঢাকার বাইরে ৳১৩০
                        </span>
                      </li>
                      <li>
                        <Icon name="gift" size={20} />
                        <span>
                          <b>ফ্রি ডেলিভারি</b>
                          যেকোনো ৪টি বা বেশি পণ্যে
                        </span>
                      </li>
                      <li>
                        <Icon name="wallet" size={20} />
                        <span>
                          <b>ক্যাশ অন ডেলিভারি</b>
                          পণ্য হাতে পেয়ে মূল্য দিন
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
                {products.some(
                  (p) =>
                    p.category === product.category && p.id !== product.id,
                ) && (
                  <section className="section">
                    <div className="section-head">
                      <div>
                        <span className="eyebrow">আরও দেখুন</span>
                        <h2>একই ধরনের পণ্য</h2>
                      </div>
                    </div>
                    <div className="catalog-grid">
                      {products
                        .filter(
                          (p) =>
                            p.category === product.category &&
                            p.id !== product.id,
                        )
                        .slice(0, 4)
                        .map(card)}
                    </div>
                  </section>
                )}
              </>
            ) : path[0] === "policies" ? (
              <article className="policy">
                <span className="eyebrow">নীতিমালা</span>
                <h1>{policies[path[1]] || "নীতিমালা"}</h1>
                <p>
                  এটি পুনর্নির্মিত স্টোরের নমুনা নীতিমালা। চালু করার আগে ব্যবসার
                  অনুমোদিত নীতিমালা এখানে যোগ করুন।
                </p>
                <Link className="btn btn-outline" href="/">
                  হোমে ফিরুন <Icon name="arrow" size={18} />
                </Link>
              </article>
            ) : (
              <>
                <div className="shop-head">
                  <div>
                    <h1>{query ? `“${query}” এর ফলাফল` : title}</h1>
                    <p>{filtered.length.toLocaleString("bn-BD")}টি পণ্য</p>
                  </div>
                  <label className="select">
                    <span className="sr-only">পণ্য সাজান</span>
                    <select
                      aria-label="পণ্য সাজান"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      <option value="default">সর্বশেষ পণ্য</option>
                      <option value="low">দাম: কম থেকে বেশি</option>
                      <option value="high">দাম: বেশি থেকে কম</option>
                    </select>
                  </label>
                </div>
                <nav className="chips" aria-label="ক্যাটাগরি">
                  <Link
                    href="/shop"
                    className={!category && !query ? "active" : undefined}
                    onClick={() => setQuery("")}
                  >
                    সব পণ্য
                  </Link>
                  {categories.map((c) => (
                    <Link
                      key={c.slug}
                      href={"/categories/" + c.slug}
                      className={
                        category?.slug === c.slug ? "active" : undefined
                      }
                      onClick={() => setQuery("")}
                    >
                      {c.name}
                    </Link>
                  ))}
                </nav>
                {filtered.length ? (
                  <div className="catalog-grid">{filtered.map(card)}</div>
                ) : (
                  <div className="empty-state">
                    <span className="empty-icon">
                      <Icon name="search" size={28} />
                    </span>
                    <h2>কোনো পণ্য পাওয়া যায়নি</h2>
                    <p>অন্য শব্দ দিয়ে খুঁজুন অথবা সব পণ্য দেখুন।</p>
                    <Link
                      className="btn btn-primary"
                      href="/shop"
                      onClick={() => setQuery("")}
                    >
                      সব পণ্য দেখুন
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
      <FamilyFooter />
      {toast && (
        <div className="toast" role="status">
          <Icon name="check" size={18} /> {toast}
        </div>
      )}
      <dialog
        ref={dialog}
        className="cart-dialog"
        aria-labelledby="cart-title"
        onCancel={() => setDrawer(false)}
        onClick={(e) => {
          if (e.target === dialog.current) setDrawer(false);
        }}
      >
        <div className="cart-panel">
          <div className="cart-head">
            <h2 id="cart-title">
              {checkout ? "চেকআউট" : "আপনার কার্ট"}
              <span className="count-pill">{count.toLocaleString("bn-BD")}</span>
            </h2>
            <button
              className="icon-button"
              aria-label="কার্ট বন্ধ করুন"
              onClick={() => setDrawer(false)}
            >
              <Icon name="close" size={22} />
            </button>
          </div>
          {order ? (
            <div className="cart-state">
              <span className="empty-icon empty-icon--success">
                <Icon name="check" size={30} />
              </span>
              <h2>অর্ডার সফল হয়েছে</h2>
              <p>
                অর্ডার নম্বর: <b>{order}</b>
                <br />
                পণ্য হাতে পেয়ে মূল্য পরিশোধ করুন।
              </p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setOrder("");
                  setDrawer(false);
                }}
              >
                কেনাকাটা চালিয়ে যান
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="cart-state">
              <span className="empty-icon">
                <Icon name="bag" size={28} />
              </span>
              <h2>আপনার কার্ট খালি</h2>
              <p>পছন্দের পণ্য কার্টে যোগ করুন।</p>
              <button
                className="btn btn-primary"
                onClick={() => setDrawer(false)}
              >
                কেনাকাটা করুন
              </button>
            </div>
          ) : (
            <>
              <div className="cart-body">
                {checkout ? (
                  <form
                    id="checkout-form"
                    className="checkout-form"
                    onSubmit={submit}
                  >
                    <ul className="order-mini">
                      {items.map((p) => (
                        <li key={p.id}>
                          <img src={p.image} alt="" />
                          <span>{p.name}</span>
                          <b>×{cart[p.id].toLocaleString("bn-BD")}</b>
                        </li>
                      ))}
                    </ul>
                    <label className="field">
                      আপনার নাম
                      <input
                        name="name"
                        required
                        minLength={2}
                        maxLength={100}
                        autoComplete="name"
                      />
                    </label>
                    <label className="field">
                      মোবাইল নম্বর
                      <input
                        name="phone"
                        type="tel"
                        inputMode="numeric"
                        required
                        pattern="01[3-9][0-9]{8}"
                        placeholder="01XXXXXXXXX"
                        autoComplete="tel"
                      />
                    </label>
                    <fieldset className="field">
                      <legend>ডেলিভারি এলাকা</legend>
                      <div className="choice-row">
                        {[
                          ["dhaka", "ঢাকার মধ্যে", "৳৮০"],
                          ["outside", "ঢাকার বাইরে", "৳১৩০"],
                        ].map(([value, label, fee]) => (
                          <label className="choice" key={value}>
                            <input
                              type="radio"
                              name="district"
                              value={value}
                              checked={district === value}
                              onChange={() => setDistrict(value)}
                            />
                            <span>
                              {label}
                              <small>{fee}</small>
                            </span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <label className="field">
                      সম্পূর্ণ ঠিকানা
                      <textarea
                        name="address"
                        required
                        minLength={10}
                        maxLength={500}
                        autoComplete="street-address"
                        placeholder="বাসা, রোড, এলাকা, জেলা"
                      />
                    </label>
                    <div className="payment-note">
                      <Icon name="wallet" size={20} />
                      <span>
                        <b>ক্যাশ অন ডেলিভারি</b>
                        পণ্য হাতে পেয়ে মূল্য পরিশোধ করুন
                      </span>
                    </div>
                  </form>
                ) : (
                  items.map((p) => (
                    <div className="cart-row" key={p.id}>
                      <img src={p.image} alt={p.name} />
                      <div className="cart-row-info">
                        <b>{p.name}</b>
                        <span className="cart-row-price">
                          {money(p.price * cart[p.id])}
                        </span>
                        <div className="cart-row-actions">
                          <div className="quantity">
                            <button
                              aria-label="পরিমাণ কমান"
                              onClick={() => change(p.id, -1)}
                            >
                              <Icon name="minus" size={16} />
                            </button>
                            <span>{cart[p.id]}</span>
                            <button
                              aria-label="পরিমাণ বাড়ান"
                              onClick={() => change(p.id, 1)}
                            >
                              <Icon name="plus" size={16} />
                            </button>
                          </div>
                          <button
                            className="remove"
                            aria-label="পণ্য সরান"
                            onClick={() =>
                              setCart((c) => {
                                const n = { ...c };
                                delete n[p.id];
                                return n;
                              })
                            }
                          >
                            <Icon name="trash" size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="cart-foot">
                {delivery > 0 && count < 4 ? (
                  <div className="free-meter">
                    <p>
                      আর {(4 - count).toLocaleString("bn-BD")}টি পণ্য যোগ করলে
                      ডেলিভারি <b>ফ্রি</b>
                    </p>
                    <span>
                      <i style={{ width: (count / 4) * 100 + "%" }} />
                    </span>
                  </div>
                ) : delivery === 0 ? (
                  <div className="free-meter free-meter--done">
                    <p>
                      <Icon name="check" size={16} /> আপনি ফ্রি ডেলিভারি
                      পাচ্ছেন
                    </p>
                  </div>
                ) : null}
                <dl className="cart-summary">
                  <div>
                    <dt>সাবটোটাল</dt>
                    <dd>{money(subtotal)}</dd>
                  </div>
                  <div>
                    <dt>ডেলিভারি</dt>
                    <dd>{delivery === 0 ? "ফ্রি" : money(delivery)}</dd>
                  </div>
                  <div className="total">
                    <dt>মোট</dt>
                    <dd>{money(subtotal + delivery)}</dd>
                  </div>
                </dl>
                {checkout ? (
                  <>
                    {error && (
                      <p role="alert" className="form-error">
                        {error}
                      </p>
                    )}
                    <button
                      className="btn btn-primary btn-block btn-lg"
                      form="checkout-form"
                      disabled={busy}
                    >
                      {busy ? "অর্ডার হচ্ছে…" : "অর্ডার নিশ্চিত করুন"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-block"
                      onClick={() => setCheckout(false)}
                    >
                      কার্টে ফিরুন
                    </button>
                  </>
                ) : (
                  <button
                    className="btn btn-primary btn-block btn-lg"
                    onClick={() => setCheckout(true)}
                  >
                    চেকআউট করুন <Icon name="arrow" size={18} />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
