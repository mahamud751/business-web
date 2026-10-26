"use client";
import { useState, useEffect, useRef, useMemo, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import parse, {
  Element,
  domToReact,
  attributesToProps,
  type DOMNode,
  type HTMLReactParserOptions,
} from "html-react-parser";
import home from "@/lib/home-template.json";
import header from "@/lib/header-template.json";
import footer from "@/lib/footer-template.json";
import contact from "@/lib/contact-template.json";
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
  const [slide, setSlide] = useState(0);
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
    const timer = setInterval(() => setSlide((s) => (s + 1) % 3), 6500);
    return () => clearInterval(timer);
  }, []);
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
    router.push("/shop?q=" + encodeURIComponent(q));
  }
  function Card({ p }: { p: Product }) {
    return (
      <article className="product-card">
        <div className="product-image">
          <Link className="product-image-link" href={"/product/" + p.slug}>
            <img
              src={p.image}
              alt={p.name}
              loading="lazy"
              style={{
                position: "absolute",
                height: "100%",
                width: "100%",
                inset: 0,
              }}
            />
          </Link>
          <button
            className="ui-button ui-button--accent quick-add"
            aria-label={p.name + " কার্টে যোগ করুন"}
            onClick={() => add(p)}
            disabled={!p.stock}
          >
            Add to cart{" "}
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
        <div className="product-info">
          <span>{p.category}</span>
          <h3>
            <Link href={"/product/" + p.slug}>{p.name}</Link>
          </h3>
          <p>
            <b>{money(p.price)}</b>
            <del>{money(p.originalPrice)}</del>
          </p>
        </div>
      </article>
    );
  }
  const options: HTMLReactParserOptions = {
    replace(node) {
      if (!(node instanceof Element)) return;
      const cls = node.attribs.class || "";
      const children = () => domToReact(node.children as DOMNode[], options);
      if (cls === "product-card") {
        const findId = (n: DOMNode): string | undefined => {
          if (!(n instanceof Element)) return;
          return (
            n.attribs["data-product-id"] ||
            n.children.map((c) => findId(c as DOMNode)).find(Boolean)
          );
        };
        const p = products.find((p) => p.id === findId(node));
        if (p) return <Card p={p} />;
      }
      if (node.name === "input")
        return (
          <input
            {...attributesToProps(node.attribs)}
            name="q"
            defaultValue=""
            value={undefined}
          />
        );
      if (node.name === "form")
        return (
          <form {...attributesToProps(node.attribs)} onSubmit={search}>
            {children()}
          </form>
        );
      if (cls.split(" ").includes("bag-button"))
        return (
          <button
            {...attributesToProps(node.attribs)}
            aria-label={`কার্টে ${count}টি পণ্য আছে`}
            onClick={() => {
              setDrawer(true);
              setCheckout(false);
            }}
          >
            {children()}
            {count > 0 && <span className="cart-counter">{count}</span>}
          </button>
        );
      if (node.attribs["aria-controls"] === "mobile-site-menu")
        return (
          <button
            {...attributesToProps(node.attribs)}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {children()}
          </button>
        );
      if (cls === "hero-slides")
        return (
          <div className={cls}>
            {node.children
              .filter((n) => n instanceof Element)
              .map((n, i) => {
                const el = n as Element;
                return (
                  <Link
                    key={i}
                    href={el.attribs.href}
                    className={"hero-slide" + (slide === i ? " active" : "")}
                    aria-hidden={slide !== i}
                    tabIndex={slide === i ? 0 : -1}
                  >
                    {domToReact(el.children as DOMNode[], options)}
                  </Link>
                );
              })}
          </div>
        );
      if (cls.includes("hero-carousel-dots"))
        return (
          <div className={cls}>
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                className={slide === i ? "active" : ""}
                aria-label={`${i + 1} নম্বর ব্যানার`}
                aria-current={slide === i}
                onClick={() => setSlide(i)}
              >
                <span />
              </button>
            ))}
          </div>
        );
      if (node.attribs["data-quick-add"]) {
        const p = products.find(
          (p) => p.id === node.attribs["data-product-id"],
        );
        return (
          <button
            {...attributesToProps(node.attribs)}
            onClick={() => p && add(p)}
          >
            {children()}
          </button>
        );
      }
      if (
        node.name === "a" &&
        node.attribs.href?.startsWith("/") &&
        !node.attribs.href.startsWith("//")
      )
        return (
          <Link
            {...attributesToProps(node.attribs)}
            href={node.attribs.href === "/#shop" ? "/shop" : node.attribs.href}
          >
            {children()}
          </Link>
        );
      if (node.name === "a" && node.attribs.href === "#shop")
        return (
          <Link {...attributesToProps(node.attribs)} href="/shop">
            {children()}
          </Link>
        );
    },
  };
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
  return (
    <>
      <main>
        {isHome ? (
          parse(home, options)
        ) : (
          <>
            {parse(header, options)}
            <div className="inner-page section-shell">
              <div className="breadcrumbs">
                <Link href="/">হোম</Link> / <Link href="/shop">শপ</Link> /{" "}
                {product?.name || title}
              </div>
              {product ? (
                <div className="detail-grid">
                  <img
                    className="detail-image"
                    src={product.image}
                    alt={product.name}
                  />
                  <div>
                    <span className="kicker">{product.category}</span>
                    <h1>{product.name}</h1>
                    <p className="detail-price">
                      {money(product.price)}{" "}
                      <del>{money(product.originalPrice)}</del>
                    </p>
                    <p>{product.stock > 0 ? "✓ স্টকে আছে" : "স্টকে নেই"}</p>
                    <p>
                      পরিবারের জন্য বাছাই করা পণ্য। সারাদেশে হোম ডেলিভারি এবং
                      ক্যাশ অন ডেলিভারি সুবিধা।
                    </p>
                    <button
                      className="primary"
                      disabled={!product.stock}
                      onClick={() => add(product)}
                    >
                      কার্টে যোগ করুন
                    </button>{" "}
                    <button
                      className="secondary"
                      disabled={!product.stock}
                      onClick={() => {
                        add(product);
                        setDrawer(true);
                        setCheckout(true);
                      }}
                    >
                      এখনই কিনুন
                    </button>
                    <div className="delivery-note">
                      ঢাকায় ডেলিভারি ৳৮০ · ঢাকার বাইরে ৳১৩০
                      <br />
                      যেকোনো ৪+ পণ্যে ফ্রি ডেলিভারি
                    </div>
                  </div>
                </div>
              ) : path[0] === "policies" ? (
                <div className="policy">
                  <h1>
                    {(
                      {
                        delivery: "ডেলিভারি নীতি",
                        "returns-refunds": "রিটার্ন ও রিফান্ড নীতি",
                        privacy: "প্রাইভেসি পলিসি",
                        terms: "ব্যবহারের শর্তাবলি",
                      } as Record<string, string>
                    )[path[1]] || "নীতিমালা"}
                  </h1>
                  <p>
                    এটি পুনর্নির্মিত স্টোরের নমুনা নীতিমালা। চালু করার আগে
                    ব্যবসার অনুমোদিত নীতিমালা এখানে যোগ করুন।
                  </p>
                  <Link href="/">হোমে ফিরুন →</Link>
                </div>
              ) : (
                <>
                  <div className="section-heading">
                    <div>
                      <span className="kicker">Tuhfa Mart-এর বাছাই</span>
                      <h1>{query ? `“${query}” এর ফলাফল` : title}</h1>
                      <p>{filtered.length.toLocaleString("bn-BD")}টি পণ্য</p>
                    </div>
                    <select
                      aria-label="পণ্য সাজান"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      <option value="default">সর্বশেষ পণ্য</option>
                      <option value="low">দাম: কম থেকে বেশি</option>
                      <option value="high">দাম: বেশি থেকে কম</option>
                    </select>
                  </div>
                  <nav className="category-pills">
                    <Link href="/shop" onClick={() => setQuery("")}>
                      সব পণ্য
                    </Link>
                    {categories.map((c) => (
                      <Link
                        key={c.slug}
                        href={"/categories/" + c.slug}
                        onClick={() => setQuery("")}
                      >
                        {c.name}
                      </Link>
                    ))}
                  </nav>
                  <div className="catalog-grid">
                    {filtered.map((p) => (
                      <Card key={p.id} p={p} />
                    ))}
                  </div>
                  {!filtered.length && (
                    <div className="empty-state">
                      <h2>কোনো পণ্য পাওয়া যায়নি</h2>
                      <p>অন্য শব্দ দিয়ে খুঁজুন অথবা সব পণ্য দেখুন।</p>
                      <Link href="/shop" onClick={() => setQuery("")}>
                        সব পণ্য দেখুন →
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
            {parse(footer, options)}
          </>
        )}
      </main>
      {parse(contact)}
      {menu && (
        <nav id="mobile-site-menu" className="mobile-menu">
          <Link href="/shop" onClick={() => setMenu(false)}>
            শপ
          </Link>
          <Link href="/#categories" onClick={() => setMenu(false)}>
            ক্যাটাগরি
          </Link>
          <Link href="/#new" onClick={() => setMenu(false)}>
            নতুন পণ্য
          </Link>
          <Link href="/#offers" onClick={() => setMenu(false)}>
            অফার
          </Link>
        </nav>
      )}
      {toast && (
        <div className="toast" role="status">
          ✓ {toast}
        </div>
      )}
      <dialog
        ref={dialog}
        className="cart-dialog"
        onCancel={() => setDrawer(false)}
        onClick={(e) => {
          if (e.target === dialog.current) setDrawer(false);
        }}
      >
        <div className="cart-content">
          <div className="cart-title">
            <h2>
              {checkout ? "চেকআউট" : "আপনার কার্ট"} <small>({count})</small>
            </h2>
            <button
              aria-label="কার্ট বন্ধ করুন"
              onClick={() => setDrawer(false)}
            >
              ×
            </button>
          </div>
          {order ? (
            <div className="empty-state">
              <h2>✓ অর্ডার সফল হয়েছে</h2>
              <p>অর্ডার নম্বর: {order}</p>
              <button
                className="primary"
                onClick={() => {
                  setOrder("");
                  setDrawer(false);
                }}
              >
                কেনাকাটা চালিয়ে যান
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="empty-state">
              <h2>আপনার কার্ট খালি</h2>
              <p>পছন্দের পণ্য কার্টে যোগ করুন।</p>
              <button className="primary" onClick={() => setDrawer(false)}>
                কেনাকাটা করুন
              </button>
            </div>
          ) : (
            <>
              {items.map((p) => (
                <div className="cart-row" key={p.id}>
                  <img src={p.image} alt={p.name} />
                  <div>
                    <b>{p.name}</b>
                    <p>{money(p.price)}</p>
                    <div className="quantity">
                      <button
                        aria-label="পরিমাণ কমান"
                        onClick={() => change(p.id, -1)}
                      >
                        −
                      </button>
                      <span>{cart[p.id]}</span>
                      <button
                        aria-label="পরিমাণ বাড়ান"
                        onClick={() => change(p.id, 1)}
                      >
                        +
                      </button>
                    </div>
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
                    ×
                  </button>
                </div>
              ))}
              <div className="cart-summary">
                <p>
                  সাবটোটাল <b>{money(subtotal)}</b>
                </p>
                <p>
                  ডেলিভারি <b>{delivery === 0 ? "ফ্রি" : money(delivery)}</b>
                </p>
                <p className="total">
                  মোট <b>{money(subtotal + delivery)}</b>
                </p>
              </div>
              {checkout ? (
                <form className="checkout-form" onSubmit={submit}>
                  <label>
                    আপনার নাম
                    <input
                      name="name"
                      required
                      minLength={2}
                      maxLength={100}
                      autoComplete="name"
                    />
                  </label>
                  <label>
                    মোবাইল নম্বর
                    <input
                      name="phone"
                      type="tel"
                      required
                      pattern="01[3-9][0-9]{8}"
                      placeholder="01XXXXXXXXX"
                      autoComplete="tel"
                    />
                  </label>
                  <label>
                    ডেলিভারি এলাকা
                    <select
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                    >
                      <option value="dhaka">ঢাকার মধ্যে</option>
                      <option value="outside">ঢাকার বাইরে</option>
                    </select>
                  </label>
                  <label>
                    সম্পূর্ণ ঠিকানা
                    <textarea
                      name="address"
                      required
                      minLength={10}
                      maxLength={500}
                      autoComplete="street-address"
                    />
                  </label>
                  <p>পেমেন্ট: Cash on Delivery</p>
                  {error && (
                    <p role="alert" className="form-error">
                      {error}
                    </p>
                  )}
                  <button className="primary" disabled={busy}>
                    {busy ? "অর্ডার হচ্ছে…" : "অর্ডার নিশ্চিত করুন"}
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setCheckout(false)}
                  >
                    কার্টে ফিরুন
                  </button>
                </form>
              ) : (
                <button
                  className="primary full"
                  onClick={() => setCheckout(true)}
                >
                  চেকআউট করুন →
                </button>
              )}
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
