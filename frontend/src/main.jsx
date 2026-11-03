import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Heart, ShoppingBag, Search, Sun, Moon, Leaf, Menu, X, ArrowRight, Plus, Minus, Trash2, MapPin, LogOut, Package, LayoutDashboard, Settings, Truck, Users, FolderTree, ClipboardList, ChevronDown, CheckCircle2 } from 'lucide-react';
import './styles.css';
const API = 'http://localhost:4000/api', money = n => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0
}).format(Number(n || 0));
const get = (key, fallback) => {
    try {
        return JSON.parse(localStorage.getItem(key)) ?? fallback;
    }
    catch {
        return fallback;
    }
};
const put = (key, value) => localStorage.setItem(key, JSON.stringify(value));
async function request(path, { token, method = 'GET', body, form } = {}) {
    const r = await fetch(API + path, {
        method, headers: {
            ...(token ? {
                Authorization: `Bearer ${token}`
            } : {}), ...(body && !form ? {
                'Content-Type': 'application/json'
            } : {})
        }, body: form || body ? form || JSON.stringify(body) : undefined
    });
    const data = await r.json().catch(() => ({
        message: 'The server returned an unreadable response.'
    }));
    if (!r.ok)
        throw new Error(data.message || 'Request failed.');
    return data;
}
function Notice({ notice }) {
    return notice ? <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-leaf-900 px-5 py-3 text-sm text-white shadow-xl">{notice}
  </div> : null;
}
function Button({ children, className = '', ...props }) {
    return <button className={'inline-flex items-center justify-center gap-2 rounded-full bg-leaf-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-leaf-900 disabled:cursor-not-allowed disabled:opacity-50 ' + className} {...props}>{children}
  </button>;
}
function Image({ src, alt, className = '' }) {
    return <img src={src ? src.startsWith('http') ? src : `http://localhost:4000${src}` : '/seed/plant-placeholder.svg'} alt={alt} className={className} loading="lazy"/>;
}
function Stock({ p }) {
    return p.stock <= 0 ? <span className="badge bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200">Out of stock</span> : p.stock <= p.low_stock_threshold ? <span className="badge bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">Only {p.stock}
    left</span> : <span className="badge bg-leaf-100 text-leaf-900 dark:bg-leaf-900 dark:text-leaf-100">In stock</span>;
}
function PlantCard({ p, onOpen, onWish, onCart, wished }) {
    return <article className="group overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-slate-900">
    <button onClick={() => onOpen(p.id)} className="block h-48 w-full overflow-hidden bg-leaf-50">
      <Image src={p.image} alt={p.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105"/>
    </button>
    <div className="p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <button onClick={() => onOpen(p.id)} className="text-left font-display text-xl font-bold leading-tight hover:text-leaf-700">{p.name}
        </button>
        <button aria-label="Toggle wishlist" onClick={() => onWish(p)} className={'rounded-full p-2 ' + (wished ? 'bg-rose-50 text-rose-600' : 'text-slate-500 hover:bg-slate-100')}>
          <Heart size={18} fill={wished ? 'currentColor' : 'none'}/>
        </button>
      </div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-leaf-700">{p.category}
      </p>
      <p className="line-clamp-2 min-h-10 text-sm text-slate-600 dark:text-slate-300">{p.short_description}
      </p>
      <div className="mt-3 flex items-center justify-between">
        <b>{money(p.price)}
        </b>
        <Stock p={p}/>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button onClick={() => onOpen(p.id)} className="btn-secondary">Details</button>
        <Button disabled={p.stock < 1} onClick={() => onCart(p)}>
          <ShoppingBag size={16}/>
          Add</Button>
      </div>
    </div>
  </article>;
}
function Header({ site, user, cartCount, wishCount, dark, setDark, navigate, onLogout }) {
    const [open, setOpen] = useState(false);
    const nav = x => {
        navigate(x);
        setOpen(false);
    };
    return <header className="sticky top-0 z-40 border-b border-black/5 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-slate-950/90">
    <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
      <button onClick={() => nav('/')} className="flex items-center gap-2 text-left">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-leaf-700 text-white">
          <Leaf />
        </span>
        <span>
          <b className="block font-display text-lg leading-none">{site.nursery_name || 'Verdant Home Nursery'}
          </b>
          <small className="text-leaf-700">locally grown, thoughtfully chosen</small>
        </span>
      </button>
      <nav className="hidden items-center gap-5 lg:flex">{[['/', 'Home'], ['/plants', 'Plants'], ['/categories', 'Categories'], ['/about', 'About'], ['/contact', 'Contact'], ['/faq', 'FAQ']].map(([to, label]) => <button key={to} onClick={() => nav(to)} className="text-sm font-medium hover:text-leaf-700">{label}
          </button>)}
      </nav>
      <div className="flex items-center gap-1">
        <button aria-label="Toggle dark mode" onClick={() => setDark(!dark)} className="icon-btn">{dark ? <Sun size={19}/> : <Moon size={19}/>}
        </button>
        <button aria-label="Wishlist" onClick={() => nav('/wishlist')} className="icon-btn relative">
          <Heart size={19}/>{wishCount > 0 && <i>{wishCount}
            </i>}
        </button>
        <button aria-label="Cart" onClick={() => nav('/cart')} className="icon-btn relative">
          <ShoppingBag size={19}/>{cartCount > 0 && <i>{cartCount}
            </i>}
        </button>{user ? <button onClick={() => nav(user.role === 'owner' ? '/owner' : '/account')} className="hidden rounded-full bg-leaf-100 px-3 py-2 text-sm font-semibold text-leaf-900 md:block">{user.name.split(' ')[0]}
          </button> : <button onClick={() => nav('/login')} className="hidden rounded-full bg-leaf-700 px-3 py-2 text-sm font-semibold text-white md:block">Login</button>}
        <button onClick={() => setOpen(!open)} className="icon-btn lg:hidden">{open ? <X /> : <Menu />}
        </button>
      </div>
    </div>{open && <div className="border-t border-black/5 px-4 pb-3 lg:hidden">{[['/', 'Home'], ['/plants', 'Plants'], ['/categories', 'Categories'], ['/about', 'About'], ['/contact', 'Contact'], ['/faq', 'FAQ'], [user ? '/account' : '/login', user ? 'My account' : 'Login']].map(([to, label]) => <button key={to} onClick={() => nav(to)} className="block w-full border-b border-black/5 py-3 text-left">{label}
          </button>)}
      </div>}
  </header>;
}
function Home({ site, categories, faqs, openPlant, navigate, onWish, onCart, wished }) {
    const [featured, setFeatured] = useState([]);
    useEffect(() => {
        request('/plants?featured=true').then(x => setFeatured(x.plants)).catch(() => {
        });
    }, []);
    return <>
    <section className="hero">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
        <div className="self-center">
          <p className="eyebrow">A calm corner starts here</p>
          <h1>{site.hero_heading || 'Bring home a little more green.'}
          </h1>
          <p className="mt-5 max-w-xl text-lg text-slate-700 dark:text-slate-200">{site.hero_description}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button onClick={() => navigate('/plants')}>{site.hero_primary_cta || 'Explore plants'}
              <ArrowRight size={17}/>
            </Button>
            <button onClick={() => navigate('/about')} className="btn-secondary px-5">{site.hero_secondary_cta || 'Our story'}
            </button>
          </div>
        </div>
        <div className="overflow-hidden rounded-[2rem] bg-leaf-100 shadow-xl">
          <Image src="/seed/plant-placeholder.svg" alt="Illustration of a healthy green potted plant" className="h-full min-h-72 w-full object-cover"/>
        </div>
      </div>
    </section>
    <section className="section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Find your kind of green</p>
          <h2>Shop by category</h2>
        </div>
        <button onClick={() => navigate('/categories')} className="link">All categories <ArrowRight size={16}/>
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">{categories.slice(0, 5).map(c => <button key={c.id} onClick={() => navigate('/plants?category=' + c.slug)} className="category-card">
            <Leaf />
            <span>{c.name}
            </span>
          </button>)}
      </div>
    </section>
    <section className="section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Picked for you</p>
          <h2>Featured plants</h2>
        </div>
        <button onClick={() => navigate('/plants')} className="link">Browse all <ArrowRight size={16}/>
        </button>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{featured.map(p => <PlantCard key={p.id} p={p} onOpen={openPlant} onWish={onWish} onCart={onCart} wished={wished(p.id)}/>)}
      </div>
    </section>
    <section className="section grid gap-6 md:grid-cols-3">
      <Info title="Choose with confidence" text="Plant descriptions, stock status, and care details are kept clear and up to date."/>
      <Info title="Made for local life" text="Choose a delivery or pickup option available for your address at checkout."/>
      <Info title="Care starts at home" text="Ask a question using the owner-managed WhatsApp enquiry link on available plant pages."/>
    </section>
    <section className="section grid gap-8 rounded-3xl bg-sand p-8 dark:bg-slate-900 md:grid-cols-2">
      <div>
        <p className="eyebrow">Our nursery</p>
        <h2>A garden story that is yours to tell.</h2>
        <p className="mt-4 text-slate-700 dark:text-slate-300">{site.about_text}
        </p>
        <button className="link mt-5" onClick={() => navigate('/about')}>Read more <ArrowRight size={16}/>
        </button>
      </div>
      <div>
        <p className="eyebrow">Common questions</p>{faqs.slice(0, 3).map(f => <details className="border-b border-leaf-900/10 py-3" key={f.id}>
              <summary className="cursor-pointer font-semibold">{f.question}
              </summary>
              <p className="pt-2 text-sm text-slate-600 dark:text-slate-300">{f.answer}
              </p>
            </details>)}
      </div>
    </section>
  </>;
}
function Info({ title, text }) {
    return <div className="rounded-2xl border border-leaf-100 bg-leaf-50 p-6 dark:border-leaf-900 dark:bg-slate-900">
    <CheckCircle2 className="mb-4 text-leaf-700"/>
    <h3 className="font-display text-xl font-bold">{title}
    </h3>
    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{text}
    </p>
  </div>;
}
function Catalog({ categories, openPlant, onWish, onCart, wished, initialCategory = '' }) {
    const [filters, setFilters] = useState({
        q: '', category: initialCategory, sort: 'newest', availability: '', min: '', max: ''
    }), [data, setData] = useState({
        plants: []
    }), [loading, setLoading] = useState(true);
    useEffect(() => {
        setLoading(true);
        const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== ''));
        request('/plants?' + qs).then(setData).catch(() => setData({
            plants: []
        })).finally(() => setLoading(false));
    }, [JSON.stringify(filters)]);
    return <section className="section">
    <p className="eyebrow">The collection</p>
    <h1 className="text-4xl">Find the right plant</h1>
    <div className="mt-6 grid gap-3 rounded-2xl bg-leaf-50 p-4 dark:bg-slate-900 md:grid-cols-6">
      <label className="md:col-span-2">
        <span className="sr-only">Search plants</span>
        <div className="input-icon">
          <Search size={18}/>
          <input value={filters.q} onChange={e => setFilters({
            ...filters, q: e.target.value
        })} placeholder="Search plants"/>
        </div>
      </label>
      <select value={filters.category} onChange={e => setFilters({
            ...filters, category: e.target.value
        })}>
        <option value="">All categories</option>{categories.map(c => <option key={c.id} value={c.slug}>{c.name}
            </option>)}
      </select>
      <select value={filters.availability} onChange={e => setFilters({
            ...filters, availability: e.target.value
        })}>
        <option value="">Any availability</option>
        <option value="in">In stock</option>
        <option value="out">Out of stock</option>
      </select>
      <input type="number" placeholder="Min ₹" value={filters.min} onChange={e => setFilters({
            ...filters, min: e.target.value
        })}/>
      <select value={filters.sort} onChange={e => setFilters({
            ...filters, sort: e.target.value
        })}>
        <option value="newest">Newest</option>
        <option value="price_asc">Price: low first</option>
        <option value="price_desc">Price: high first</option>
        <option value="name">Name</option>
      </select>
    </div>{loading ? <p className="py-16 text-center">Loading plants…</p> : data.plants.length ? <>
        <p className="mt-5 text-sm text-slate-500">{data.total}
          plants found</p>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{data.plants.map(p => <PlantCard key={p.id} p={p} onOpen={openPlant} onWish={onWish} onCart={onCart} wished={wished(p.id)}/>)}
        </div>
      </> : <Empty title="No plants found" text="Try a different search or remove a filter."/>}
  </section>;
}
function PlantDetails({ id, onBack, onWish, onCart, wished, site, navigate }) {
    const [p, setP] = useState(null), [qty, setQty] = useState(1), [image, setImage] = useState('');
    useEffect(() => {
        request('/plants/' + id).then(x => {
            setP(x);
            setImage(x.images?.[0]?.path || x.image);
        }).catch(() => setP(false));
    }, [id]);
    if (p === null)
        return <div className="section text-center">Loading plant…</div>;
    if (!p)
        return <Empty title="Plant not found" text="It may be hidden or no longer available."/>;
    const whatsapp = site.whatsapp_number?.replace(/\D/g, '');
    return <section className="section">
    <button className="link mb-5" onClick={onBack}>← Back to plants</button>
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        <div className="overflow-hidden rounded-3xl bg-leaf-50">
          <Image src={image} alt={p.name} className="h-[420px] w-full object-cover"/>
        </div>
        <div className="mt-3 flex gap-2">{p.images.map(i => <button key={i.id} onClick={() => setImage(i.path)} className={'overflow-hidden rounded-lg border-2 ' + (image === i.path ? 'border-leaf-700' : 'border-transparent')}>
              <Image src={i.path} alt={i.alt_text || p.name} className="h-16 w-16 object-cover"/>
            </button>)}
        </div>
      </div>
      <div>
        <p className="eyebrow">{p.category}
        </p>
        <h1>{p.name}
        </h1>{p.botanical_name && <em className="mt-1 block text-slate-500">{p.botanical_name}
          </em>}
        <p className="mt-4 text-3xl font-bold text-leaf-900 dark:text-leaf-100">{money(p.price)}
        </p>
        <div className="mt-3">
          <Stock p={p}/>
        </div>
        <p className="mt-5 leading-7 text-slate-700 dark:text-slate-200">{p.description || p.short_description}
        </p>
        <div className="my-6 flex items-center gap-3">
          <div className="flex items-center rounded-full border">
            <button className="p-2" onClick={() => setQty(Math.max(1, qty - 1))}>
              <Minus size={16}/>
            </button>
            <b className="w-8 text-center">{qty}
            </b>
            <button className="p-2" disabled={qty >= p.stock} onClick={() => setQty(qty + 1)}>
              <Plus size={16}/>
            </button>
          </div>
          <Button disabled={!p.stock} onClick={() => onCart(p, qty)}>
            <ShoppingBag size={17}/> Add to cart</Button>
          <button onClick={() => onWish(p)} className={'icon-btn ' + (wished ? 'text-rose-600' : '')}>
            <Heart fill={wished ? 'currentColor' : 'none'}/>
          </button>
        </div>
        <div className="grid gap-2 border-t pt-5 text-sm sm:grid-cols-2">{[['Plant type', p.plant_type], ['Sunlight', p.sunlight], ['Water', p.water], ['Soil', p.soil], ['Best location', p.suitable_location], ['Height', p.height], ['Season', p.seasonal_info]].filter(x => x[1]).map(([a, b]) => <p key={a}>
              <b>{a}:</b> {b}
            </p>)}
        </div>{p.care_instructions && <div className="mt-5 rounded-xl bg-leaf-50 p-4 text-sm dark:bg-slate-900">
            <b>Care instructions</b>
            <p className="mt-1">{p.care_instructions}
            </p>
          </div>}
        {whatsapp && <a className="btn-secondary mt-5" target="_blank" href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hello, I would like to enquire about ${p.name}
      (${money(p.price)}).`)}`}>Enquire on WhatsApp</a>}
        <button className="link ml-4" onClick={() => {
            onCart(p, qty);
            navigate('/checkout');
        }}>Buy now <ArrowRight size={16}/>
        </button>
      </div>
    </div>
  </section>;
}
function Empty({ title, text }) {
    return <div className="section text-center">
    <Leaf className="mx-auto mb-3 text-leaf-700" size={42}/>
    <h2>{title}
    </h2>
    <p className="mt-2 text-slate-500">{text}
    </p>
  </div>;
}
function Auth({ mode, onAuth, navigate }) {
    const [form, setForm] = useState({
        name: '', email: '', phone: '', password: '', confirmPassword: ''
    }), [busy, setBusy] = useState(false), [error, setError] = useState('');
    const register = mode === 'register';
    const submit = async (e) => {
        e.preventDefault();
        if (register && form.password !== form.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        setBusy(true);
        setError('');
        try {
            const r = await request('/auth/' + (register ? 'register' : 'login'), {
                method: 'POST', body: form
            });
            await onAuth(r);
            navigate(r.user.role === 'owner' ? '/owner' : '/checkout');
        }
        catch (e) {
            setError(e.message);
        }
        finally {
            setBusy(false);
        }
    };
    return <section className="section max-w-lg">
    <p className="eyebrow">{register ? 'New customer' : 'Welcome back'}
    </p>
    <h1>{register ? 'Create your account' : 'Login to your account'}
    </h1>
    <p className="mt-2 text-slate-600 dark:text-slate-300">You only need an account to place an order. Your saved guest cart and wishlist will come with you.</p>
    <form onSubmit={submit} className="card mt-6 space-y-4">{register && <Field label="Full name">
          <input required value={form.name} onChange={e => setForm({
                ...form, name: e.target.value
            })}/>
        </Field>}
      <Field label="Email">
        <input required type="email" value={form.email} onChange={e => setForm({
            ...form, email: e.target.value
        })}/>
      </Field>{register && <Field label="Mobile number">
          <input required value={form.phone} onChange={e => setForm({
                ...form, phone: e.target.value
            })}/>
        </Field>}
      <Field label="Password">
        <input required type="password" minLength="8" value={form.password} onChange={e => setForm({
            ...form, password: e.target.value
        })}/>
      </Field>{register && <Field label="Confirm password">
          <input required type="password" minLength="8" value={form.confirmPassword} onChange={e => setForm({
                ...form, confirmPassword: e.target.value
            })}/>
        </Field>}
      {error && <p className="error">{error}
        </p>}
      <Button disabled={busy} className="w-full">{busy ? 'Please wait…' : register ? 'Create account' : 'Login'}
      </Button>
      <p className="text-center text-sm">{register ? 'Already have an account?' : 'New here?'}
        <button type="button" className="link" onClick={() => navigate(register ? '/login' : '/register')}>{register ? 'Login' : 'Create account'}
        </button>
      </p>
    </form>
  </section>;
}
function Field({ label, children }) {
    return <label className="block text-sm font-semibold">
    <span className="mb-1 block">{label}
    </span>{children}
  </label>;
}
function Cart({ items, onQty, onRemove, navigate }) {
    const subtotal = items.reduce((n, x) => n + x.price * x.quantity, 0);
    return <section className="section max-w-4xl">
    <p className="eyebrow">Your selection</p>
    <h1>Shopping cart</h1>{!items.length ? <>
        <Empty title="Your cart is empty" text="Plants you add will stay here while you browse."/>
        <Button onClick={() => navigate('/plants')}>Explore plants</Button>
      </> : <>
        <div className="mt-6 space-y-3">{items.map(x => <div className="card flex gap-4" key={x.id}>
              <Image src={x.image} alt={x.name} className="h-24 w-24 rounded-xl object-cover"/>
              <div className="min-w-0 flex-1">
                <b>{x.name}
                </b>
                <p className="text-sm text-slate-500">{money(x.price)}
                  each</p>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center rounded-full border">
                    <button className="p-2" onClick={() => onQty(x, x.quantity - 1)}>
                      <Minus size={15}/>
                    </button>
                    <b className="w-8 text-center">{x.quantity}
                    </b>
                    <button className="p-2" onClick={() => onQty(x, x.quantity + 1)} disabled={x.quantity >= x.stock}>
                      <Plus size={15}/>
                    </button>
                  </div>
                  <button aria-label="Remove from cart" onClick={() => onRemove(x)} className="icon-btn text-rose-600">
                    <Trash2 size={18}/>
                  </button>
                </div>
              </div>
              <b>{money(x.price * x.quantity)}
              </b>
            </div>)}
        </div>
        <div className="card mt-5 ml-auto max-w-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <b>{money(subtotal)}
            </b>
          </div>
          <p className="mt-2 text-xs text-slate-500">Delivery is calculated at checkout.</p>
          <Button className="mt-4 w-full" onClick={() => navigate('/checkout')}>Proceed to checkout <ArrowRight size={16}/>
          </Button>
          <button className="link mt-4 w-full" onClick={() => navigate('/plants')}>Continue shopping</button>
        </div>
      </>}
  </section>;
}
function Wishlist({ items, onWish, onCart, openPlant, wished, navigate }) {
    return <section className="section">
    <p className="eyebrow">Saved for later</p>
    <h1>Wishlist</h1>{items.length ? <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{items.map(p => <PlantCard key={p.id} p={p} onOpen={openPlant} onWish={onWish} onCart={onCart} wished={wished(p.id)}/>)}
      </div> : <>
        <Empty title="Your wishlist is empty" text="Tap the heart on any plant to save it for later — no account required."/>
        <Button onClick={() => navigate('/plants')}>Browse plants</Button>
      </>}
  </section>;
}
function Checkout({ user, items, token, navigate, refresh, notify }) {
    const [info, setInfo] = useState(null), [addresses, setAddresses] = useState([]), [form, setForm] = useState({
        addressId: '', deliveryMethod: 'delivery', paymentMethod: 'cod', notes: '', full_name: '', phone: '', address_line: '', city: '', state: '', pin_code: '', landmark: ''
    }), [error, setError] = useState(''), [busy, setBusy] = useState(false);
    useEffect(() => {
        if (user && token) {
            Promise.all([request('/checkout-info', {
                    token
                }), request('/addresses', {
                    token
                })]).then(([x, a]) => {
                setInfo(x);
                setAddresses(a);
                if (a[0])
                    setForm(f => ({
                        ...f, addressId: String(a[0].id)
                    }));
            }).catch(e => setError(e.message));
        }
    }, [user, token]);
    if (!user)
        return <section className="section max-w-xl">
    <p className="eyebrow">One last step</p>
    <h1>Login to place your order</h1>
    <p className="mt-3 text-slate-600 dark:text-slate-300">You can browse, save, and fill your cart as a guest. Create an account now so we can safely save your order and delivery details.</p>
    <Button className="mt-6" onClick={() => navigate('/login')}>Login or create account</Button>
  </section>;
    if (!items.length)
        return <Empty title="Your cart is empty" text="Add a plant before checking out."/>;
    const subtotal = items.reduce((s, x) => s + x.price * x.quantity, 0), delivery = info?.delivery;
    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            const shipping = form.addressId ? undefined : Object.fromEntries(['full_name', 'phone', 'address_line', 'city', 'state', 'pin_code', 'landmark'].map(k => [k, form[k]]));
            const r = await request('/orders', {
                token, method: 'POST', body: {
                    ...form, addressId: form.addressId || undefined, shipping
                }
            });
            notify(r.message);
            await refresh();
            navigate('/account');
        }
        catch (e) {
            setError(e.message);
        }
        finally {
            setBusy(false);
        }
    };
    return <section className="section max-w-5xl">
    <p className="eyebrow">Secure order review</p>
    <h1>Checkout</h1>
    <form onSubmit={submit} className="mt-6 grid gap-6 lg:grid-cols-[1fr,360px]">
      <div className="space-y-5">
        <div className="card">
          <h2 className="text-xl">Delivery address</h2>{addresses.length > 0 && <Field label="Saved address">
              <select value={form.addressId} onChange={e => setForm({
                ...form, addressId: e.target.value
            })}>
                <option value="">Use a new address</option>{addresses.map(a => <option key={a.id} value={a.id}>{a.label}: {a.address_line}, {a.city}
                    </option>)}
              </select>
            </Field>}
          {!form.addressId && <div className="mt-4 grid gap-3 sm:grid-cols-2">{[['full_name', 'Full name'], ['phone', 'Mobile'], ['address_line', 'Address'], ['city', 'City'], ['state', 'State'], ['pin_code', 'PIN code'], ['landmark', 'Landmark (optional)']].map(([k, l]) => <Field key={k} label={l}>
                  <input required={k !== 'landmark'} value={form[k]} onChange={e => setForm({
                    ...form, [k]: e.target.value
                })}/>
                </Field>)}
            </div>}
          <button type="button" className="link mt-4" onClick={() => navigate('/account')}>Manage saved addresses</button>
        </div>
        <div className="card">
          <h2 className="text-xl">Delivery & payment</h2>
          <div className="mt-3 grid gap-3">
            <label className="radio">
              <input type="radio" checked={form.deliveryMethod === 'delivery'} disabled={!delivery?.delivery_enabled} onChange={() => setForm({
            ...form, deliveryMethod: 'delivery'
        })}/>
              Local delivery</label>
            <label className="radio">
              <input type="radio" checked={form.deliveryMethod === 'pickup'} disabled={!delivery?.pickup_enabled} onChange={() => setForm({
            ...form, deliveryMethod: 'pickup'
        })}/>
              Customer pickup</label>
          </div>
          <p className="mt-2 text-sm text-slate-500">{delivery?.estimated_text}
          </p>
          <div className="mt-4 grid gap-3">
            <label className="radio">
              <input type="radio" checked={form.paymentMethod === 'cod'} onChange={() => setForm({
            ...form, paymentMethod: 'cod'
        })}/>
              Cash on delivery / pickup</label>
            <label className="radio">
              <input type="radio" checked={form.paymentMethod === 'upi'} onChange={() => setForm({
            ...form, paymentMethod: 'upi'
        })}/>
              Manual UPI payment</label>
          </div>
          <Field label="Order notes (optional)">
            <textarea value={form.notes} onChange={e => setForm({
            ...form, notes: e.target.value
        })}/>
          </Field>
        </div>
      </div>
      <aside className="card h-fit">
        <h2 className="text-xl">Order summary</h2>{items.map(x => <div className="mt-3 flex justify-between text-sm" key={x.id}>
              <span>{x.name}
                × {x.quantity}
              </span>
              <b>{money(x.price * x.quantity)}
              </b>
            </div>)}
        <hr />
        <div className="flex justify-between">
          <span>Subtotal</span>
          <b>{money(subtotal)}
          </b>
        </div>
        <div className="mt-2 flex justify-between">
          <span>Delivery</span>
          <span>Calculated when you place the order</span>
        </div>
        <p className="mt-3 text-xs text-slate-500">The nursery verifies current price, stock, and delivery availability before accepting your order.</p>{error && <p className="error mt-3">{error}
          </p>}
        <Button disabled={busy} className="mt-4 w-full">{busy ? 'Placing order…' : 'Place order'}
        </Button>
      </aside>
    </form>
  </section>;
}
function Account({ user, token, onLogout, notify }) {
    const [tab, setTab] = useState('orders'), [orders, setOrders] = useState([]), [addresses, setAddresses] = useState([]), [profile, setProfile] = useState(user), [address, setAddress] = useState({
        label: 'Home', full_name: user.name, phone: user.phone || '', address_line: '', city: '', state: '', pin_code: '', landmark: '', is_default: false
    });
    const load = () => Promise.all([request('/orders', {
            token
        }), request('/addresses', {
            token
        })]).then(([o, a]) => {
        setOrders(o);
        setAddresses(a);
    });
    useEffect(() => {
        load();
    }, []);
    const saveAddress = async (e) => {
        e.preventDefault();
        await request('/addresses', {
            token, method: 'POST', body: address
        });
        notify('Address saved.');
        setAddress({
            ...address, address_line: '', city: '', state: '', pin_code: '', landmark: ''
        });
        load();
    };
    return <section className="section">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="eyebrow">Your nursery account</p>
        <h1>Hello, {user.name.split(' ')[0]}
        </h1>
      </div>
      <button className="btn-secondary" onClick={onLogout}>
        <LogOut size={16}/> Logout</button>
    </div>
    <div className="mt-6 flex gap-2 overflow-auto border-b">{[['orders', 'Orders'], ['addresses', 'Addresses'], ['profile', 'Profile']].map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={'tab ' + (tab === id ? 'active' : '')}>{label}
        </button>)}
    </div>{tab === 'orders' && <div className="mt-5 space-y-4">{orders.length ? orders.map(o => <div className="card" key={o.id}>
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <b>{o.order_number}
                </b>
                <p className="text-sm text-slate-500">{new Date(o.created_at).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <Status value={o.status}/>
                <p className="mt-1 font-bold">{money(o.total)}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">{o.items.map(i => <span className="rounded-full bg-leaf-50 px-3 py-1 dark:bg-slate-800" key={i.id}>{i.product_name}
                  × {i.quantity}
                </span>)}
            </div>
            <div className="mt-4 track">{['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'].map(s => <span key={s} className={['cancelled'].includes(o.status) ? '' : ' ' + (['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'].indexOf(s) <= ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'].indexOf(o.status) ? 'done' : '')}>{s.replaceAll('_', ' ')}
                </span>)}
            </div>{['pending', 'confirmed'].includes(o.status) && !o.cancellation_requested && <button className="link mt-4" onClick={async () => {
                        await request(`/orders/${o.id}/cancel-request`, {
                            token, method: 'POST'
                        });
                        notify('Cancellation request sent.');
                        load();
                    }}>Request cancellation</button>}
            {o.cancellation_requested && <p className="mt-3 text-sm text-amber-700">Cancellation requested — the nursery will review it.</p>}
          </div>) : <Empty title="No orders yet" text="Your completed orders will be shown here."/>}
      </div>}
    {tab === 'addresses' && <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <form className="card space-y-3" onSubmit={saveAddress}>
          <h2 className="text-xl">Add an address</h2>
          <select value={address.label} onChange={e => setAddress({
                ...address, label: e.target.value
            })}>{['Home', 'Work', 'Other'].map(x => <option key={x}>{x}
                </option>)}
          </select>{[['full_name', 'Full name'], ['phone', 'Mobile'], ['address_line', 'Address'], ['city', 'City'], ['state', 'State'], ['pin_code', 'PIN code'], ['landmark', 'Landmark']].map(([k, l]) => <Field label={l} key={k}>
                <input required={k !== 'landmark'} value={address[k]} onChange={e => setAddress({
                    ...address, [k]: e.target.value
                })}/>
              </Field>)}
          <label className="radio">
            <input type="checkbox" checked={address.is_default} onChange={e => setAddress({
                ...address, is_default: e.target.checked
            })}/>
            Set as default</label>
          <Button>Save address</Button>
        </form>
        <div className="space-y-3">{addresses.map(a => <div className="card" key={a.id}>
              <b>{a.label}
                {a.is_default && '• Default'}
              </b>
              <p className="mt-2 text-sm">{a.full_name}, {a.phone}
                <br />{a.address_line}, {a.city}, {a.state}
                — {a.pin_code}
              </p>
              <button className="link mt-3 text-rose-600" onClick={async () => {
                    await request('/addresses/' + a.id, {
                        token, method: 'DELETE'
                    });
                    load();
                }}>Delete</button>
            </div>)}
        </div>
      </div>}
    {tab === 'profile' && <form className="card mt-5 max-w-lg space-y-3" onSubmit={async (e) => {
                e.preventDefault();
                const saved = await request('/me', {
                    token, method: 'PUT', body: profile
                });
                setProfile(saved);
                notify('Profile saved.');
            }}>
        <Field label="Full name">
          <input value={profile.name} onChange={e => setProfile({
                ...profile, name: e.target.value
            })}/>
        </Field>
        <Field label="Mobile">
          <input value={profile.phone || ''} onChange={e => setProfile({
                ...profile, phone: e.target.value
            })}/>
        </Field>
        <Field label="Email">
          <input disabled value={profile.email}/>
        </Field>
        <Button>Save profile</Button>
      </form>}
  </section>;
}
function Status({ value }) {
    return <span className="badge bg-leaf-100 text-leaf-900 dark:bg-leaf-900 dark:text-leaf-100">{value.replaceAll('_', ' ')}
  </span>;
}
const blankPlant = {
    name: '', category_id: '', price: '', short_description: '', description: '', stock: '0', low_stock_threshold: '5', status: 'published', featured: false, botanical_name: '', plant_type: '', sunlight: '', water: '', soil: '', suitable_location: '', height: '', care_instructions: '', seasonal_info: ''
};
function Owner({ token, user, onLogout, notify }) {
    const [tab, setTab] = useState('dashboard'), [data, setData] = useState({}), [busy, setBusy] = useState(false);
    const load = async (t) => {
        setBusy(true);
        try {
            const paths = {
                dashboard: '/admin/dashboard', catalog: '/admin/plants', categories: '/admin/categories', inventory: '/admin/inventory', orders: '/admin/orders', customers: '/admin/customers', content: '/admin/settings', faq: '/admin/faqs', delivery: '/admin/settings'
            };
            setData(d => ({
                ...d, [t]: await request(paths[t], {
                    token
                })
            }));
        }
        catch (e) {
            notify(e.message);
        }
        finally {
            setBusy(false);
        }
    };
    useEffect(() => {
        load(tab);
    }, [tab]);
    const nav = [['dashboard', 'Dashboard', LayoutDashboard], ['catalog', 'Catalog', Package], ['categories', 'Categories', FolderTree], ['inventory', 'Inventory', ClipboardList], ['orders', 'Orders', Truck], ['customers', 'Customers', Users], ['content', 'Website content', Settings], ['faq', 'FAQ', ChevronDown], ['delivery', 'Delivery', MapPin]];
    return <div className="min-h-screen bg-sand dark:bg-slate-950">
    <div className="border-b bg-leaf-900 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-leaf-100">Private control centre</p>
          <h1 className="font-display text-2xl">Owner Portal</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm sm:block">{user.name}
          </span>
          <button onClick={onLogout} className="rounded-full border border-white/30 px-3 py-2 text-sm">Logout</button>
        </div>
      </div>
    </div>
    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[210px,1fr]">
      <aside className="flex gap-2 overflow-auto lg:block">{nav.map(([id, label, Icon]) => <button key={id} onClick={() => setTab(id)} className={'owner-nav ' + (tab === id ? 'active' : '')}>
            <Icon size={17}/>{label}
          </button>)}
      </aside>
      <main>{busy ? <p>Loading owner data…</p> : tab === 'dashboard' ? <Dashboard data={data.dashboard}/> : tab === 'catalog' ? <CatalogAdmin data={data.catalog || []} token={token} reload={() => load('catalog')} notify={notify}/> : tab === 'categories' ? <CategoriesAdmin data={data.categories || []} token={token} reload={() => load('categories')} notify={notify}/> : tab === 'inventory' ? <InventoryAdmin data={data.inventory} token={token} reload={() => load('inventory')} notify={notify}/> : tab === 'orders' ? <OrdersAdmin data={data.orders || []} token={token} reload={() => load('orders')} notify={notify}/> : tab === 'customers' ? <CustomersAdmin data={data.customers || []}/> : tab === 'content' || tab === 'delivery' ? <SettingsAdmin data={data[tab]} token={token} reload={() => load(tab)} notify={notify} onlyDelivery={tab === 'delivery'}/> : <FaqAdmin data={data.faq || []} token={token} reload={() => load('faq')} notify={notify}/>}
      </main>
    </div>
  </div>;
}
function Dashboard({ data }) {
    if (!data)
        return null;
    const c = data.counts;
    return <>
    <p className="eyebrow">At a glance</p>
    <h2>Nursery dashboard</h2>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[['Total plants', c.plants], ['Published', c.published], ['Low stock', c.low_stock], ['Out of stock', c.out_of_stock], ['Customers', c.customers], ['Total orders', c.orders], ['Pending orders', c.pending], ['Completed', c.completed]].map(([a, b]) => <div className="metric" key={a}>
          <span>{a}
          </span>
          <b>{b}
          </b>
        </div>)}
    </div>
    <div className="mt-6 grid gap-5 lg:grid-cols-2">
      <div className="card">
        <h3 className="text-xl">Recent orders</h3>{data.recentOrders.map(o => <div className="flex justify-between border-b py-3 text-sm" key={o.id}>
              <span>
                <b>{o.order_number}
                </b>
                <br />{o.customer_name}
              </span>
              <span className="text-right">
                <Status value={o.status}/>
                <br />{money(o.total)}
              </span>
            </div>)}
      </div>
      <div className="card">
        <h3 className="text-xl">Recent customers</h3>{data.recentCustomers.map(x => <div className="border-b py-3 text-sm" key={x.id}>
              <b>{x.name}
              </b>
              <br />
              <span className="text-slate-500">{x.email}
              </span>
            </div>)}
      </div>
    </div>
  </>;
}
function CatalogAdmin({ data, token, reload, notify }) {
    const [edit, setEdit] = useState(null), [form, setForm] = useState(blankPlant), [categories, setCategories] = useState([]), [image, setImage] = useState(null);
    useEffect(() => {
        request('/admin/categories', {
            token
        }).then(setCategories);
    }, []);
    const start = p => {
        setEdit(p || null);
        setForm(p ? Object.fromEntries(Object.entries(blankPlant).map(([k, v]) => [k, p[k] ?? v])) : blankPlant);
    };
    const save = async (e) => {
        e.preventDefault();
        const r = await request(edit ? `/admin/plants/${edit.id}` : '/admin/plants', {
            token, method: edit ? 'PUT' : 'POST', body: {
                ...form, category_id: Number(form.category_id), price: Number(form.price), stock: Number(form.stock), low_stock_threshold: Number(form.low_stock_threshold), featured: !!form.featured
            }
        });
        if (image) {
            const fd = new FormData();
            fd.append('images', image);
            await request(`/admin/plants/${r.id || edit.id}/images`, {
                token, method: 'POST', form: fd
            });
        }
        notify(r.message);
        setEdit(null);
        setImage(null);
        reload();
    };
    if (edit !== null)
        return <form onSubmit={save}>
    <div className="flex justify-between">
      <div>
        <p className="eyebrow">Catalog editor</p>
        <h2>{edit ? 'Edit plant' : 'Add plant'}
        </h2>
      </div>
      <button type="button" className="btn-secondary" onClick={() => setEdit(null)}>Back</button>
    </div>
    <div className="card mt-5 grid gap-4 md:grid-cols-2">{[['name', 'Plant name'], ['price', 'Price (₹)'], ['stock', 'Stock quantity'], ['low_stock_threshold', 'Low stock warning at'], ['botanical_name', 'Botanical name'], ['plant_type', 'Plant type'], ['sunlight', 'Sunlight'], ['water', 'Water'], ['soil', 'Soil'], ['suitable_location', 'Suitable location'], ['height', 'Height'], ['seasonal_info', 'Seasonal information']].map(([k, l]) => <Field key={k} label={l}>
          <input required={['name', 'price', 'stock'].includes(k)} type={['price', 'stock', 'low_stock_threshold'].includes(k) ? 'number' : 'text'} value={form[k]} onChange={e => setForm({
                    ...form, [k]: e.target.value
                })}/>
        </Field>)}
      <Field label="Category">
        <select required value={form.category_id} onChange={e => setForm({
                ...form, category_id: e.target.value
            })}>
          <option value="">Choose category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}
              </option>)}
        </select>
      </Field>
      <Field label="Publishing">
        <select value={form.status} onChange={e => setForm({
                ...form, status: e.target.value
            })}>{['published', 'hidden', 'draft', 'unavailable'].map(x => <option key={x}>{x}
              </option>)}
        </select>
      </Field>
      <div className="md:col-span-2">
        <Field label="Short description">
          <input required value={form.short_description} onChange={e => setForm({
                ...form, short_description: e.target.value
            })}/>
        </Field>
      </div>
      <div className="md:col-span-2">
        <Field label="Full description">
          <textarea value={form.description} onChange={e => setForm({
                ...form, description: e.target.value
            })}/>
        </Field>
      </div>
      <div className="md:col-span-2">
        <Field label="Care instructions">
          <textarea value={form.care_instructions} onChange={e => setForm({
                ...form, care_instructions: e.target.value
            })}/>
        </Field>
      </div>
      <label className="radio">
        <input type="checkbox" checked={!!form.featured} onChange={e => setForm({
                ...form, featured: e.target.checked
            })}/>
        Feature on home page</label>
      <Field label="Upload image(s)">
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setImage(e.target.files[0])}/>
      </Field>
    </div>
    <Button className="mt-5">Save plant</Button>
  </form>;
    return <>
    <div className="flex justify-between">
      <div>
        <p className="eyebrow">Plant catalog</p>
        <h2>Manage plants</h2>
      </div>
      <Button onClick={() => start()}> <Plus size={16}/>
        Add plant</Button>
    </div>
    <div className="table-card mt-5">
      <table>
        <thead>
          <tr>
            <th>Plant</th>
            <th>Category</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Status</th>
            <th>
            </th>
          </tr>
        </thead>
        <tbody>{data.map(p => <tr key={p.id}>
              <td>
                <b>{p.name}
                </b>{p.featured && <small> Featured</small>}
              </td>
              <td>{p.category}
              </td>
              <td>{money(p.price)}
              </td>
              <td>{p.stock}
              </td>
              <td>
                <Status value={p.status}/>
              </td>
              <td>
                <button className="link" onClick={() => start(p)}>Edit</button> <button className="link text-rose-600" onClick={async () => {
                if (confirm(`Archive ${p.name}?`)) {
                    await request('/admin/plants/' + p.id, {
                        token, method: 'DELETE'
                    });
                    reload();
                }
            }}>Archive</button>
              </td>
            </tr>)}
        </tbody>
      </table>
    </div>
  </>;
}
function CategoriesAdmin({ data, token, reload, notify }) {
    const [form, setForm] = useState({
        name: '', description: '', enabled: true, sort_order: 0
    });
    const save = async (e) => {
        e.preventDefault();
        await request('/admin/categories', {
            token, method: 'POST', body: form
        });
        notify('Category added.');
        setForm({
            name: '', description: '', enabled: true, sort_order: 0
        });
        reload();
    };
    return <>
    <p className="eyebrow">Catalog organisation</p>
    <h2>Categories</h2>
    <form onSubmit={save} className="card mt-5 grid gap-3 sm:grid-cols-4">
      <Field label="Name">
        <input required value={form.name} onChange={e => setForm({
            ...form, name: e.target.value
        })}/>
      </Field>
      <Field label="Description">
        <input value={form.description} onChange={e => setForm({
            ...form, description: e.target.value
        })}/>
      </Field>
      <Field label="Sort order">
        <input type="number" value={form.sort_order} onChange={e => setForm({
            ...form, sort_order: e.target.value
        })}/>
      </Field>
      <Button className="self-end">Add category</Button>
    </form>
    <div className="table-card mt-5">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Plants</th>
            <th>Visible</th>
            <th>Order</th>
            <th>
            </th>
          </tr>
        </thead>
        <tbody>{data.map(c => <tr key={c.id}>
              <td>
                <b>{c.name}
                </b>
              </td>
              <td>{c.plant_count}
              </td>
              <td>{c.enabled ? 'Yes' : 'No'}
              </td>
              <td>{c.sort_order}
              </td>
              <td>
                <button className="link" onClick={async () => {
                const name = prompt('Category name', c.name);
                if (name) {
                    await request('/admin/categories/' + c.id, {
                        token, method: 'PUT', body: {
                            ...c, name
                        }
                    });
                    reload();
                }
            }}>Edit</button> <button className="link text-rose-600" onClick={async () => {
                if (confirm('Delete this empty category?')) {
                    try {
                        await request('/admin/categories/' + c.id, {
                            token, method: 'DELETE'
                        });
                        reload();
                    }
                    catch (e) {
                        notify(e.message);
                    }
                }
            }}>Delete</button>
              </td>
            </tr>)}
        </tbody>
      </table>
    </div>
  </>;
}
function InventoryAdmin({ data, token, reload, notify }) {
    if (!data)
        return null;
    return <>
    <p className="eyebrow">Stock control</p>
    <h2>Inventory</h2>
    <div className="table-card mt-5">
      <table>
        <thead>
          <tr>
            <th>Plant</th>
            <th>Stock</th>
            <th>Warning at</th>
            <th>Adjust</th>
          </tr>
        </thead>
        <tbody>{data.plants.map(p => <tr key={p.id}>
              <td>{p.name}
              </td>
              <td>
                <Stock p={p}/>
                <b className="ml-2">{p.stock}
                </b>
              </td>
              <td>{p.low_stock_threshold}
              </td>
              <td>
                <button className="link" onClick={async () => {
                const amount = Number(prompt('Use a positive number for stock-in; a negative number for stock-out.', '0'));
                if (amount) {
                    try {
                        await request(`/admin/plants/${p.id}/stock`, {
                            token, method: 'POST', body: {
                                amount, reason: 'Owner stock adjustment'
                            }
                        });
                        reload();
                    }
                    catch (e) {
                        notify(e.message);
                    }
                }
            }}>Adjust stock</button>
              </td>
            </tr>)}
        </tbody>
      </table>
    </div>
    <div className="card mt-5">
      <h3 className="text-xl">Recent inventory activity</h3>{data.history.slice(0, 15).map(x => <p className="border-b py-2 text-sm" key={x.id}>
            <b>{x.plant_name}
            </b> {x.change_amount > 0 ? '+' : ''}
            {x.change_amount}
            — {x.reason}
          </p>)}
    </div>
  </>;
}
function OrdersAdmin({ data, token, reload, notify }) {
    return <>
    <p className="eyebrow">Order desk</p>
    <h2>Orders</h2>
    <div className="mt-5 space-y-4">{data.map(o => <div className="card" key={o.id}>
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <b>{o.order_number}
              </b>
              <p className="text-sm">{o.customer_name}
                · {o.customer_email}
              </p>
              <p className="text-sm text-slate-500">{o.shipping_address}, {o.shipping_city}
                — {o.shipping_pin_code}
              </p>
            </div>
            <b>{money(o.total)}
            </b>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">{o.items.map(i => <span className="badge bg-leaf-50 text-leaf-900 dark:bg-slate-800 dark:text-white" key={i.id}>{i.product_name}
                × {i.quantity}
                ({money(i.unit_price)})</span>)}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Field label="Status">
              <select defaultValue={o.status} onChange={async (e) => {
                await request('/admin/orders/' + o.id, {
                    token, method: 'PUT', body: {
                        status: e.target.value, payment_status: o.payment_status, internal_notes: o.internal_notes || ''
                    }
                });
                notify('Order status updated.');
                reload();
            }}>{['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'].map(x => <option key={x}>{x}
                    </option>)}
              </select>
            </Field>
            <Field label="Payment">
              <select defaultValue={o.payment_status} onChange={async (e) => {
                await request('/admin/orders/' + o.id, {
                    token, method: 'PUT', body: {
                        status: o.status, payment_status: e.target.value, internal_notes: o.internal_notes || ''
                    }
                });
                reload();
            }}>{['pending', 'paid', 'failed'].map(x => <option key={x}>{x}
                    </option>)}
              </select>
            </Field>
            <Field label="Internal notes">
              <input defaultValue={o.internal_notes || ''} onBlur={async (e) => {
                await request('/admin/orders/' + o.id, {
                    token, method: 'PUT', body: {
                        status: o.status, payment_status: o.payment_status, internal_notes: e.target.value
                    }
                });
            }}/>
            </Field>
          </div>{o.cancellation_requested && <p className="mt-3 text-amber-700">Customer requested cancellation. Set status to Cancelled to restore stock once.</p>}
        </div>)}
    </div>
  </>;
}
function CustomersAdmin({ data }) {
    return <>
    <p className="eyebrow">Customer records</p>
    <h2>Customers</h2>
    <div className="table-card mt-5">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Contact</th>
            <th>Joined</th>
            <th>Orders</th>
            <th>Order value</th>
          </tr>
        </thead>
        <tbody>{data.map(x => <tr key={x.id}>
              <td>
                <b>{x.name}
                </b>
              </td>
              <td>{x.email}
                <br />{x.phone}
              </td>
              <td>{new Date(x.created_at).toLocaleDateString()}
              </td>
              <td>{x.order_count}
              </td>
              <td>{money(x.order_value)}
              </td>
            </tr>)}
        </tbody>
      </table>
    </div>
  </>;
}
function SettingsAdmin({ data, token, reload, notify, onlyDelivery }) {
    const [state, setState] = useState(null), [zone, setZone] = useState({
        name: '', pin_codes: '', fee: 0, enabled: true
    });
    useEffect(() => setState(data), [data]);
    if (!state)
        return null;
    const s = state.settings, d = state.delivery;
    const save = async (e) => {
        e.preventDefault();
        await request('/admin/settings', {
            token, method: 'PUT', body: {
                settings: s, delivery: d
            }
        });
        notify('Settings saved.');
        reload();
    };
    return <>
    <p className="eyebrow">{onlyDelivery ? 'Local fulfilment' : 'Website control'}
    </p>
    <h2>{onlyDelivery ? 'Delivery settings' : 'Website content & settings'}
    </h2>
    <form className="card mt-5 grid gap-4 md:grid-cols-2" onSubmit={save}>{!onlyDelivery && [['nursery_name', 'Nursery name'], ['hero_heading', 'Homepage heading'], ['hero_primary_cta', 'Primary button text'], ['hero_secondary_cta', 'Secondary button text'], ['announcement', 'Announcement'], ['phone', 'Phone'], ['email', 'Email'], ['whatsapp_number', 'WhatsApp number'], ['address', 'Address'], ['business_hours', 'Business hours']].map(([k, l]) => <Field key={k} label={l}>
            <input value={s[k] || ''} onChange={e => setState({
                ...state, settings: {
                    ...s, [k]: e.target.value
                }
            })}/>
          </Field>)}
      {!onlyDelivery && <>
          <div className="md:col-span-2">
            <Field label="Hero description">
              <textarea value={s.hero_description || ''} onChange={e => setState({
                ...state, settings: {
                    ...s, hero_description: e.target.value
                }
            })}/>
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="About us">
              <textarea value={s.about_text || ''} onChange={e => setState({
                ...state, settings: {
                    ...s, about_text: e.target.value
                }
            })}/>
            </Field>
          </div>
        </>}
      <label className="radio">
        <input type="checkbox" checked={!!d.delivery_enabled} onChange={e => setState({
            ...state, delivery: {
                ...d, delivery_enabled: e.target.checked
            }
        })}/>
        Enable local delivery</label>
      <label className="radio">
        <input type="checkbox" checked={!!d.pickup_enabled} onChange={e => setState({
            ...state, delivery: {
                ...d, pickup_enabled: e.target.checked
            }
        })}/>
        Enable customer pickup</label>
      <Field label="Free delivery threshold (₹)">
        <input type="number" value={d.free_delivery_threshold || 0} onChange={e => setState({
            ...state, delivery: {
                ...d, free_delivery_threshold: e.target.value
            }
        })}/>
      </Field>
      <Field label="Delivery estimate">
        <input value={d.estimated_text || ''} onChange={e => setState({
            ...state, delivery: {
                ...d, estimated_text: e.target.value
            }
        })}/>
      </Field>
      <div className="md:col-span-2">
        <Field label="Delivery instructions">
          <textarea value={d.instructions || ''} onChange={e => setState({
            ...state, delivery: {
                ...d, instructions: e.target.value
            }
        })}/>
        </Field>
      </div>
      <Button className="md:col-span-2">Save settings</Button>
    </form>{onlyDelivery && <>
        <h3 className="mt-7 text-xl">Delivery zones</h3>
        <form className="card mt-3 grid gap-3 sm:grid-cols-4" onSubmit={async (e) => {
                e.preventDefault();
                await request('/admin/zones', {
                    token, method: 'POST', body: zone
                });
                setZone({
                    name: '', pin_codes: '', fee: 0, enabled: true
                });
                reload();
            }}>
          <Field label="Zone name">
            <input required value={zone.name} onChange={e => setZone({
                ...zone, name: e.target.value
            })}/>
          </Field>
          <Field label="PIN codes, comma separated">
            <input required value={zone.pin_codes} onChange={e => setZone({
                ...zone, pin_codes: e.target.value
            })}/>
          </Field>
          <Field label="Charge (₹)">
            <input type="number" value={zone.fee} onChange={e => setZone({
                ...zone, fee: e.target.value
            })}/>
          </Field>
          <Button className="self-end">Add zone</Button>
        </form>
        <div className="table-card mt-3">
          <table>
            <thead>
              <tr>
                <th>Zone</th>
                <th>PIN codes</th>
                <th>Fee</th>
                <th>
                </th>
              </tr>
            </thead>
            <tbody>{state.zones.map(z => <tr key={z.id}>
                  <td>{z.name}
                  </td>
                  <td>{z.pin_codes}
                  </td>
                  <td>{money(z.fee)}
                  </td>
                  <td>
                    <button className="link text-rose-600" onClick={async () => {
                    await request('/admin/zones/' + z.id, {
                        token, method: 'DELETE'
                    });
                    reload();
                }}>Delete</button>
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </>}
  </>;
}
function FaqAdmin({ data, token, reload, notify }) {
    const [f, setF] = useState({
        question: '', answer: '', enabled: true, sort_order: 0
    });
    return <>
    <p className="eyebrow">Customer help</p>
    <h2>FAQ</h2>
    <form className="card mt-5 grid gap-3" onSubmit={async (e) => {
            e.preventDefault();
            await request('/admin/faqs', {
                token, method: 'POST', body: f
            });
            setF({
                question: '', answer: '', enabled: true, sort_order: 0
            });
            notify('FAQ added.');
            reload();
        }}>
      <Field label="Question">
        <input required value={f.question} onChange={e => setF({
            ...f, question: e.target.value
        })}/>
      </Field>
      <Field label="Answer">
        <textarea required value={f.answer} onChange={e => setF({
            ...f, answer: e.target.value
        })}/>
      </Field>
      <Button>Add FAQ</Button>
    </form>
    <div className="mt-5 space-y-3">{data.map(x => <div className="card" key={x.id}>
          <b>{x.question}
          </b>
          <p className="mt-1 text-sm">{x.answer}
          </p>
          <div className="mt-3 flex gap-4">
            <button className="link" onClick={async () => {
                const question = prompt('Question', x.question), answer = prompt('Answer', x.answer);
                if (question && answer) {
                    await request('/admin/faqs/' + x.id, {
                        token, method: 'PUT', body: {
                            ...x, question, answer
                        }
                    });
                    reload();
                }
            }}>Edit</button>
            <button className="link text-rose-600" onClick={async () => {
                await request('/admin/faqs/' + x.id, {
                    token, method: 'DELETE'
                });
                reload();
            }}>Delete</button>
          </div>
        </div>)}
    </div>
  </>;
}
function App() {
    const [path, setPath] = useState(location.pathname + location.search), [site, setSite] = useState({}), [categories, setCategories] = useState([]), [faqs, setFaqs] = useState([]), [user, setUser] = useState(get('vn_user', null)), [token, setToken] = useState(localStorage.getItem('vn_token') || ''), [guestCart, setGuestCart] = useState(get('vn_guest_cart', [])), [guestWish, setGuestWish] = useState(get('vn_guest_wish', [])), [cart, setCart] = useState([]), [wish, setWish] = useState([]), [dark, setDark] = useState(get('vn_dark', false)), [notice, setNotice] = useState('');
    const notify = x => {
        setNotice(x);
        setTimeout(() => setNotice(''), 3500);
    };
    const navigate = to => {
        history.pushState({}, '', to);
        setPath(to);
    };
    useEffect(() => {
        const h = () => setPath(location.pathname + location.search);
        addEventListener('popstate', h);
        return () => removeEventListener('popstate', h);
    }, []);
    useEffect(() => {
        document.documentElement.classList.toggle('dark', dark);
        put('vn_dark', dark);
    }, [dark]);
    useEffect(() => {
        request('/site').then(x => {
            setSite(x.settings);
            setCategories(x.categories);
            setFaqs(x.faqs);
        }).catch(e => notify('Could not reach the nursery server. Start the backend and MySQL.'));
    }, []);
    const refresh = async () => {
        if (token) {
            const [c, w] = await Promise.all([request('/cart', {
                    token
                }), request('/wishlist', {
                    token
                })]);
            setCart(c);
            setWish(w);
        }
    };
    useEffect(() => {
        if (token)
            refresh().catch(() => logout());
    }, [token]);
    const logout = () => {
        localStorage.removeItem('vn_token');
        localStorage.removeItem('vn_user');
        setToken('');
        setUser(null);
        navigate('/');
    };
    const onAuth = async (r) => {
        localStorage.setItem('vn_token', r.token);
        put('vn_user', r.user);
        setToken(r.token);
        setUser(r.user);
        const merged = await request('/sync-guest', {
            token: r.token, method: 'POST', body: {
                cart: guestCart.map(x => ({
                    plantId: x.id, quantity: x.quantity
                })), wishlist: guestWish.map(x => x.id)
            }
        });
        setCart(merged.cart);
        setWish(merged.wishlist);
        setGuestCart([]);
        setGuestWish([]);
        put('vn_guest_cart', []);
        put('vn_guest_wish', []);
        if (merged.notices?.length)
            notify(merged.notices[0]);
    };
    const visibleCart = token ? cart : guestCart, visibleWish = token ? wish : guestWish;
    const onWish = async (p) => {
        if (token) {
            const has = wish.some(x => x.id === p.id);
            const w = await request('/wishlist/' + p.id, {
                token, method: has ? 'DELETE' : 'POST'
            });
            setWish(w);
        }
        else {
            const next = guestWish.some(x => x.id === p.id) ? guestWish.filter(x => x.id !== p.id) : [...guestWish, p];
            setGuestWish(next);
            put('vn_guest_wish', next);
        }
        ;
        notify('Wishlist updated.');
    };
    const onCart = async (p, qty = 1) => {
        if (token) {
            setCart(await request('/cart/' + p.id, {
                token, method: 'POST', body: {
                    quantity: qty
                }
            }));
        }
        else {
            const old = guestCart.find(x => x.id === p.id), quantity = Math.min(p.stock, (old?.quantity || 0) + qty), next = old ? guestCart.map(x => x.id === p.id ? {
                ...x, quantity
            } : x) : [...guestCart, {
                    ...p, quantity
                }];
            setGuestCart(next);
            put('vn_guest_cart', next);
        }
        notify(`${p.name} added to your cart.`);
    };
    const onQty = async (p, quantity) => {
        if (token)
            setCart(await request('/cart/' + p.id, {
                token, method: 'PUT', body: {
                    quantity
                }
            }));
        else {
            const next = quantity < 1 ? guestCart.filter(x => x.id !== p.id) : guestCart.map(x => x.id === p.id ? {
                ...x, quantity: Math.min(p.stock, quantity)
            } : x);
            setGuestCart(next);
            put('vn_guest_cart', next);
        }
    };
    const onRemove = p => onQty(p, 0);
    const qs = new URLSearchParams(path.split('?')[1] || '');
    const page = path.split('?')[0];
    const openPlant = id => navigate('/plant/' + id);
    let content = page === '/' ? <Home site={site} categories={categories} faqs={faqs} openPlant={openPlant} navigate={navigate} onWish={onWish} onCart={onCart} wished={id => visibleWish.some(x => x.id === id)}/> : page === '/plants' ? <Catalog categories={categories} initialCategory={qs.get('category') || ''} openPlant={openPlant} onWish={onWish} onCart={onCart} wished={id => visibleWish.some(x => x.id === id)}/> : page.startsWith('/plant/') ? <PlantDetails id={page.split('/')[2]} onBack={() => navigate('/plants')} onWish={onWish} onCart={onCart} wished={visibleWish.some(x => x.id === Number(page.split('/')[2]))} site={site} navigate={navigate}/> : page === '/wishlist' ? <Wishlist items={visibleWish} onWish={onWish} onCart={onCart} openPlant={openPlant} wished={id => visibleWish.some(x => x.id === id)} navigate={navigate}/> : page === '/cart' ? <Cart items={visibleCart} onQty={onQty} onRemove={onRemove} navigate={navigate}/> : page === '/checkout' ? <Checkout user={user} token={token} items={visibleCart} navigate={navigate} refresh={refresh} notify={notify}/> : page === '/login' || page === '/register' ? <Auth mode={page.slice(1)} onAuth={onAuth} navigate={navigate}/> : page === '/account' ? (user ? <Account user={user} token={token} onLogout={logout} notify={notify}/> : <Auth mode="login" onAuth={onAuth} navigate={navigate}/>) : page === '/owner' ? (user?.role === 'owner' ? <Owner token={token} user={user} onLogout={logout} notify={notify}/> : <Auth mode="login" onAuth={onAuth} navigate={navigate}/>) : page === '/categories' ? <section className="section">
    <p className="eyebrow">Plant families</p>
    <h1>Categories</h1>
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{categories.map(c => <button className="category-card text-left" key={c.id} onClick={() => navigate('/plants?category=' + c.slug)}>
          <Leaf />
          <span>{c.name}
          </span>
        </button>)}
    </div>
  </section> : page === '/about' ? <section className="section max-w-3xl">
    <p className="eyebrow">About our nursery</p>
    <h1>{site.nursery_name}
    </h1>
    <p className="mt-6 whitespace-pre-line text-lg leading-8">{site.about_text}
    </p>
  </section> : page === '/contact' ? <section className="section max-w-3xl">
    <p className="eyebrow">Get in touch</p>
    <h1>Contact</h1>{[['Phone', site.phone], ['Email', site.email], ['Address', site.address], ['Business hours', site.business_hours]].map(([a, b]) => <p className="card mt-3" key={a}>
          <b>{a}
          </b>
          <br />{b || 'This information will be added by the nursery owner.'}
        </p>)}
  </section> : page === '/faq' ? <section className="section max-w-3xl">
    <p className="eyebrow">Helpful answers</p>
    <h1>Frequently asked questions</h1>{faqs.map(f => <details className="card mt-3" key={f.id}>
          <summary className="cursor-pointer font-semibold">{f.question}
          </summary>
          <p className="pt-3">{f.answer}
          </p>
        </details>)}
  </section> : <Empty title="Page not found" text="Choose a link above to return to the nursery."/>;
    return <>
    <Header site={site} user={user} cartCount={visibleCart.reduce((a, x) => a + x.quantity, 0)} wishCount={visibleWish.length} dark={dark} setDark={setDark} navigate={navigate} onLogout={logout}/>{content}
    <footer className="mt-12 bg-leaf-900 px-4 py-10 text-leaf-50">
      <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-6">
        <div>
          <b className="font-display text-2xl">{site.nursery_name || 'Verdant Home Nursery'}
          </b>
          <p className="mt-2 max-w-sm text-sm text-leaf-100">{site.announcement}
          </p>
        </div>
        <div className="text-sm">
          <p>{site.phone}
          </p>
          <p>{site.email}
          </p>
          <p>{site.business_hours}
          </p>
        </div>
      </div>
    </footer>
    <Notice notice={notice}/>
  </>;
}
;
createRoot(document.getElementById('root')).render(<App />);
