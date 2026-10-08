/** Tema anahtarı ve ilk boyama betiği. İstemci kodu içermez; kök düzen (sunucu) ve tema deposu paylaşır. */
export const THEME_KEY = "sinyal-theme";

/** Sayfa yüklenirken (boyamadan önce) çalışır; yalnızca /panel yollarında temayı uygular (kayıt yoksa koyu). */
export const themeInitScript = `(function(){try{if(!/^\\/panel/.test(location.pathname))return;var t=localStorage.getItem('${THEME_KEY}');if(!t)t='dark';if(t==='dark')document.documentElement.setAttribute('data-theme','dark')}catch(e){}})()`;
