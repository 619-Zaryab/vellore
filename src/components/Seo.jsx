import { useEffect } from 'react';
function setMeta(attr, key, content) {
    let el = document.head.querySelector(`meta[${attr}="${key}"]`);
    if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
    }
    el.setAttribute('content', content);
}
export function Seo({ title, description, image, type = 'website', jsonLd, noindex }) {
    const ld = jsonLd ? JSON.stringify(jsonLd) : '';
    useEffect(() => {
        const full = title ? `${title} | Vellore` : 'Vellore | Considered goods for everyday life';
        document.title = full;
        const desc = description ?? 'Electronics, clothing, accessories and home products, delivered across Pakistan.';
        setMeta('name', 'description', desc);
        setMeta('property', 'og:title', full);
        setMeta('property', 'og:description', desc);
        setMeta('property', 'og:type', type);
        setMeta('property', 'og:url', window.location.href);
        if (image)
            setMeta('property', 'og:image', image);
        setMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
        setMeta('name', 'robots', noindex ? 'noindex,nofollow' : 'index,follow');
        let script = document.getElementById('ld-json');
        if (ld) {
            if (!script) {
                script = document.createElement('script');
                script.id = 'ld-json';
                script.type = 'application/ld+json';
                document.head.appendChild(script);
            }
            script.textContent = ld;
        }
        else
            script?.remove();
        return () => { document.getElementById('ld-json')?.remove(); };
    }, [title, description, image, type, ld, noindex]);
    return null;
}
