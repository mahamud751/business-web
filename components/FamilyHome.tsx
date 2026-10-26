import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { categories } from "@/lib/catalog.json";
import Icon, { type IconName } from "./icons";
const needs = [
  ["খেলায় খেলায় শেখা", "কৌতূহলী ছোট্ট মনের জন্য"],
  ["মা ও শিশুর যত্ন", "কোমল যত্ন, প্রতিদিন"],
  ["রান্নাঘরের সহায়ক", "রোজকার কাজ হোক সহজ"],
  ["প্রকৃতির ভালোটা", "সতেজতায় ভরা প্রতিদিন"],
];
const promises: [IconName, string, string][] = [
  ["truck", "সারাদেশে ডেলিভারি", "ঢাকায় ৳৮০ · ঢাকার বাইরে ৳১৩০"],
  ["wallet", "ক্যাশ অন ডেলিভারি", "পণ্য হাতে পেয়ে মূল্য দিন"],
  ["heart", "পরিবারের জন্য বাছাই", "যত্ন নিয়ে নির্বাচিত পণ্য"],
  ["gift", "ফ্রি ডেলিভারি", "যেকোনো ৪টি বা বেশি পণ্যে"],
];
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="আপন — হোম">
      <span className="brand-mark">আ</span>
      <span className="brand-text">
        আপন
        <small>little things, closer together</small>
      </span>
    </Link>
  );
}
export function FamilyHeader({
  count,
  onCart,
  onMenu,
  menu,
  search,
}: {
  count: number;
  onCart: () => void;
  onMenu: () => void;
  menu: boolean;
  search: (e: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <>
      <div className="announcement">
        <Icon name="sparkle" size={14} />
        ৪টি বা বেশি পণ্যে ফ্রি ডেলিভারি
        <span>· ক্যাশ অন ডেলিভারি সারা বাংলাদেশে</span>
      </div>
      <header className="site-header">
        <div className="container header-row">
          <button
            className="icon-button menu-button"
            aria-label={menu ? "মেনু বন্ধ করুন" : "মেনু খুলুন"}
            aria-expanded={menu}
            aria-controls="mobile-site-menu"
            onClick={onMenu}
          >
            <Icon name={menu ? "close" : "menu"} size={22} />
          </button>
          <Brand />
          <nav className="main-nav" aria-label="প্রধান মেনু">
            <Link href="/shop">সব পণ্য</Link>
            <Link href="/#categories">ক্যাটাগরি</Link>
            <Link href="/#new">আমাদের পছন্দ</Link>
            <Link href="/categories/mother-baby">মা ও শিশু</Link>
          </nav>
          <form className="header-search" role="search" onSubmit={search}>
            <Icon name="search" size={18} />
            <input
              name="q"
              type="search"
              aria-label="পণ্য খুঁজুন"
              placeholder="পণ্য খুঁজুন…"
            />
            <button type="submit" className="sr-only">
              খুঁজুন
            </button>
          </form>
          <button
            className="icon-button bag-button"
            onClick={onCart}
            aria-label={`কার্টে ${count}টি পণ্য আছে`}
          >
            <Icon name="bag" size={22} />
            {count > 0 && (
              <span className="bag-count">{count.toLocaleString("bn-BD")}</span>
            )}
          </button>
        </div>
        {menu && (
          <nav id="mobile-site-menu" className="mobile-menu" aria-label="মেনু">
            <div className="container">
              {[
                ["/shop", "সব পণ্য"],
                ["/#categories", "ক্যাটাগরি"],
                ["/#new", "আমাদের পছন্দ"],
                ["/categories/kids-toys", "খেলনা ও লার্নিং"],
                ["/categories/mother-baby", "মা ও শিশুর যত্ন"],
              ].map(([href, label]) => (
                <Link key={href} href={href} onClick={onMenu}>
                  {label}
                  <Icon name="chevron" size={18} />
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>
    </>
  );
}
export function FamilyFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-cta">
          <h2>
            বড় সুখগুলো লুকিয়ে থাকে
            <br />
            ছোট ছোট মুহূর্তে।
          </h2>
          <Link className="btn btn-light" href="/shop">
            কেনাকাটা শুরু করুন <Icon name="arrow" size={18} />
          </Link>
        </div>
        <div className="footer-grid">
          <div className="footer-about">
            <Brand />
            <p>প্রতিদিনের ছোট ছোট প্রয়োজনে, আপনার পরিবারের পাশে।</p>
          </div>
          <div>
            <h3>কেনাকাটা</h3>
            <Link href="/shop">সব পণ্য</Link>
            <Link href="/categories/mother-baby">মা ও শিশুর যত্ন</Link>
            <Link href="/categories/kids-toys">খেলনা ও লার্নিং</Link>
          </div>
          <div>
            <h3>তথ্য</h3>
            <Link href="/policies/delivery">ডেলিভারি নীতি</Link>
            <Link href="/policies/returns-refunds">রিটার্ন ও রিফান্ড</Link>
            <Link href="/policies/privacy">গোপনীয়তা</Link>
            <Link href="/policies/terms">শর্তাবলি</Link>
          </div>
          <div className="footer-note">
            <Icon name="shield" size={24} />
            <p>
              <b>ভরসা থাকুক প্রতিটি অর্ডারে</b>
              পণ্য হাতে পেয়ে মূল্য দিন — ক্যাশ অন ডেলিভারি, সারা বাংলাদেশে।
            </p>
          </div>
        </div>
        <div className="copyright">
          <span>© ২০২৬ আপন। সর্বস্বত্ব সংরক্ষিত।</span>
          <span>Made for the everyday moments.</span>
        </div>
      </div>
    </footer>
  );
}
function SectionHead({
  eyebrow,
  title,
  href,
  cta,
}: {
  eyebrow: string;
  title: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="section-head">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      <Link className="text-link" href={href}>
        {cta} <Icon name="arrow" size={16} />
      </Link>
    </div>
  );
}
export default function FamilyHome({
  featured,
  baby,
}: {
  featured: ReactNode;
  baby: ReactNode;
}) {
  return (
    <div className="home">
      <section className="container hero">
        <div className="hero-copy">
          <span className="pill">
            <span className="pill-dot" /> পরিবারের জন্য, ভালোবেসে বাছাই
          </span>
          <h1>
            ছোট ছোট যত্নে,
            <br />
            জীবন হোক <em>আরও আপন।</em>
          </h1>
          <p>
            সোনামণির প্রথম খেলনা থেকে প্রতিদিনের যত্ন — পরিবারের জন্য দরকারি
            সবকিছু, এক জায়গায়।
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary btn-lg" href="/shop">
              পণ্য দেখুন <Icon name="arrow" size={18} />
            </Link>
            <Link className="btn btn-outline btn-lg" href="#categories">
              ক্যাটাগরি দেখুন
            </Link>
          </div>
          <dl className="hero-facts">
            <div>
              <dt>৳৮০</dt>
              <dd>ঢাকায় ডেলিভারি</dd>
            </div>
            <div>
              <dt>৪+</dt>
              <dd>পণ্যে ফ্রি ডেলিভারি</dd>
            </div>
            <div>
              <dt>COD</dt>
              <dd>হাতে পেয়ে মূল্য</dd>
            </div>
          </dl>
        </div>
        <div className="hero-media">
          <div className="hero-photo">
            <img
              src="/images/why-tuhfa-mart.png"
              alt="মা ও সন্তান একসঙ্গে উপহারের বাক্স খুলছে"
            />
          </div>
          <div className="float-card float-card--bottom">
            <img src="/images/category/mom-baby.png" alt="" />
            <span>
              ছোট্ট সোনামণির জন্য
              <b>একটু বাড়তি যত্ন</b>
            </span>
          </div>
          <div className="float-card float-card--top">
            <span className="float-icon">
              <Icon name="check" size={16} />
            </span>
            ক্যাশ অন ডেলিভারি
          </div>
        </div>
      </section>
      <section className="container">
        <ul className="promises">
          {promises.map(([icon, title, text]) => (
            <li key={title}>
              <span className="promise-icon">
                <Icon name={icon} size={22} />
              </span>
              <span>
                <b>{title}</b>
                {text}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="container section" id="categories">
        <SectionHead
          eyebrow="প্রতিদিনের সঙ্গী"
          title="আজ কী দরকার আপনার?"
          href="/shop"
          cta="সব পণ্য"
        />
        <div className="category-grid">
          {categories.slice(0, 4).map((c, i) => (
            <Link
              href={"/categories/" + c.slug}
              className={"category-card tone-" + i}
              key={c.slug}
            >
              <img src={c.image} alt="" />
              <span className="category-text">
                <b>{needs[i][0]}</b>
                {needs[i][1]}
              </span>
              <span className="category-arrow">
                <Icon name="arrow-up-right" size={18} />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="container section" id="new">
        <SectionHead
          eyebrow="ভালোবেসে বাছাই করা"
          title="ছোট্ট আনন্দের কালেকশন"
          href="/categories/kids-toys"
          cta="সব খেলনা"
        />
        <div className="catalog-grid">{featured}</div>
      </section>
      <section className="container section" id="offers">
        <div className="promo">
          <div className="promo-copy">
            <span className="eyebrow">The little care collection</span>
            <h2>
              ওদের বেড়ে ওঠায়,
              <br />
              থাকুক যত্নের ছোঁয়া।
            </h2>
            <p>
              নরম তোয়ালে, আরামের বিছানা আর খাওয়ার সঙ্গী — ছোট্ট মানুষটার
              প্রতিদিন হোক একটু সুন্দর।
            </p>
            <Link className="btn btn-light" href="/categories/mother-baby">
              বেবি কালেকশন দেখুন <Icon name="arrow" size={18} />
            </Link>
          </div>
          <div className="promo-art">
            <img
              src="/images/category/mom-baby.png"
              alt="শিশুর দৈনন্দিন যত্নের সামগ্রী"
            />
          </div>
        </div>
      </section>
      <section className="container section">
        <SectionHead
          eyebrow="কোমল দিনের সঙ্গী"
          title="একটু বেশি আদর, একটু বেশি যত্ন"
          href="/categories/mother-baby"
          cta="আরও দেখুন"
        />
        <div className="catalog-grid">{baby}</div>
      </section>
      <section className="container section">
        <div className="steps">
          <div className="steps-intro">
            <span className="eyebrow">সহজ অর্ডার</span>
            <h2>তিন ধাপে আপনার দরজায়</h2>
          </div>
          <ol>
            <li>
              <span>১</span>
              <b>পছন্দের পণ্য বাছুন</b>
              কার্টে যোগ করুন, পরিমাণ ঠিক করুন।
            </li>
            <li>
              <span>২</span>
              <b>ঠিকানা দিন</b>
              নাম, মোবাইল নম্বর ও ঠিকানা দিয়ে অর্ডার নিশ্চিত করুন।
            </li>
            <li>
              <span>৩</span>
              <b>হাতে পেয়ে মূল্য দিন</b>
              পণ্য বুঝে নিয়ে ডেলিভারির সময় মূল্য পরিশোধ করুন।
            </li>
          </ol>
        </div>
      </section>
    </div>
  );
}
