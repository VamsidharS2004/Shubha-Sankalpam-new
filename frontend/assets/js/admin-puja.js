/* Admin editors for PUJAS and PACKAGES (same behaviour for both):
   date/time pickers, Private / Public / Schedule, autosave + restore, live text previews, status filter.
   Works together with admin.js (openEditPuja/savePuja/loadPujas and openEditPackage/savePackage/loadPackages). */
(function () {
    'use strict';
    var $ = function (id) { return document.getElementById(id); };
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };

    /* ---------- date / time pickers (shared) ---------- */
    function fillTimeSelects(hourId, minId) {
        var h = $(hourId), m = $(minId);
        if (!h || !m || h.options.length) return;
        for (var i = 1; i <= 12; i++) h.add(new Option(pad(i), pad(i)));
        for (var j = 0; j < 60; j += 5) m.add(new Option(pad(j), pad(j)));
    }
    function setPicker(prefix, iso) {      // iso = "YYYY-MM-DDTHH:MM..." written in India time
        var d = $(prefix + 'Date'), h = $(prefix + 'Hour'), m = $(prefix + 'Min'), a = $(prefix + 'Ap');
        if (!d) return;
        var mm = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/.exec(iso || '');
        if (!mm) { d.value = ''; h.value = '07'; m.value = '00'; a.value = 'AM'; return; }
        var H = parseInt(mm[2], 10);
        d.value = mm[1]; a.value = H >= 12 ? 'PM' : 'AM'; h.value = pad(H % 12 || 12);
        if (![].some.call(m.options, function (o) { return o.value === mm[3]; })) m.add(new Option(mm[3], mm[3]));
        m.value = mm[3];
    }
    function readPicker(prefix) {
        var d = $(prefix + 'Date'); if (!d || !d.value) return '';
        var h = parseInt($(prefix + 'Hour').value, 10) % 12;
        if ($(prefix + 'Ap').value === 'PM') h += 12;
        return d.value + 'T' + pad(h) + ':' + $(prefix + 'Min').value + ':00+05:30';
    }
    var TE_DAYS = ['ఆదివారం', 'సోమవారం', 'మంగళవారం', 'బుధవారం', 'గురువారం', 'శుక్రవారం', 'శనివారం'];
    var TE_MON = ['జనవరి', 'ఫిబ్రవరి', 'మార్చి', 'ఏప్రిల్', 'మే', 'జూన్', 'జూలై', 'ఆగస్టు', 'సెప్టెంబర్', 'అక్టోబర్', 'నవంబర్', 'డిసెంబర్'];
    var EN_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var EN_MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    function displayDate(ymd, lang) {
        var p = ymd.split('-').map(Number), dt = new Date(Date.UTC(p[0], p[1] - 1, p[2])), te = lang === 'te';
        return (te ? TE_DAYS : EN_DAYS)[dt.getUTCDay()] + ', ' + pad(p[2]) + ' ' + (te ? TE_MON : EN_MON)[p[1] - 1];
    }
    function ago(ts) { return new Date(ts).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }); }

    /* ---------- one editor (puja or package) ---------- */
    function createEditor(cfg) {
        var ui = {}, dirty = false, localTimer = null, serverTimer = null, restoring = false, lastAutoDate = '';

        function lsGet() { try { return JSON.parse(localStorage.getItem(cfg.lsKey) || 'null'); } catch (e) { return null; } }
        function lsSet(v) { try { localStorage.setItem(cfg.lsKey, JSON.stringify(v)); return true; } catch (e) { return false; } }
        function lsDel() { try { localStorage.removeItem(cfg.lsKey); } catch (e) {} }
        function drawer() { return $(cfg.drawer); }
        function isOpen() { var d = drawer(); return !!(d && d.classList.contains('active')); }
        function vis() { return $(cfg.vis).value; }
        function nameText() { return cfg.nameIds.map(function (i) { return $(i) ? $(i).value.trim() : ''; }).join(''); }

        ui.publishAtISO = function () { return readPicker(cfg.publish); };

        function applyVisibility() {
            var v = vis();
            $(cfg.scheduleBox).style.display = v === 'scheduled' ? '' : 'none';
            $(cfg.saveText).textContent = v === 'draft' ? 'Save draft' : v === 'scheduled' ? 'Save & schedule' : 'Save & publish';
        }
        function previews() {
            (cfg.previews || []).forEach(function (pv) {
                var s = $(pv[0]), d = $(pv[1]); if (!s || !d) return;
                if (window.ssSetRich) window.ssSetRich(d, s.value); else d.textContent = s.value;
            });
        }

        /* snapshot / restore */
        function snapshot() {
            var fields = {}, ed = {};
            drawer().querySelectorAll('input[id],textarea[id],select[id]').forEach(function (el) {
                if (el.type === 'file' || cfg.skipId.test(el.id)) return;
                fields[el.id] = el.type === 'checkbox' ? !!el.checked : el.value;
            });
            Object.keys(cfg.editors).forEach(function (t) {
                var c = $(cfg.editors[t]); if (!c) return;
                ed[t] = Array.prototype.map.call(c.children, function (row) {
                    var o = [];
                    row.querySelectorAll('input,textarea').forEach(function (i) { o.push([i.dataset.key || '', i.value]); });
                    return o;
                });
            });
            return { savedAt: Date.now(), index: parseInt(fields[cfg.indexId], 10), id: fields[cfg.idId] || '', name: cfg.nameIds.map(function (i) { return fields[i]; }).filter(Boolean)[0] || '', fields: fields, editors: ed };
        }
        function hasContent(s) {
            return cfg.contentIds.some(function (k) { return String(s.fields[k] || '').trim(); });
        }
        function applySnapshot(s) {
            restoring = true;
            Object.keys(s.fields).forEach(function (id) {
                var el = $(id); if (!el || el.type === 'file') return;
                if (el.type === 'checkbox') el.checked = !!s.fields[id]; else el.value = s.fields[id];
            });
            Object.keys(cfg.editors).forEach(function (t) {
                var c = $(cfg.editors[t]); if (!c) return;
                c.replaceChildren();
                ((s.editors || {})[t] || []).forEach(function (vals) { cfg.restoreRow(t, vals, c); });
            });
            if (cfg.afterRestore) cfg.afterRestore(s);
            setPicker(cfg.muhurat, s.fields[cfg.muhurat]);
            var pd = s.fields[cfg.publish + 'Date'];
            if (pd) {
                var h = parseInt(s.fields[cfg.publish + 'Hour'], 10) % 12;
                if (s.fields[cfg.publish + 'Ap'] === 'PM') h += 12;
                setPicker(cfg.publish, pd + 'T' + pad(h) + ':' + (s.fields[cfg.publish + 'Min'] || '00'));
            } else setPicker(cfg.publish, '');
            applyVisibility(); previews();
            restoring = false;
        }

        /* autosave */
        function note(text, cls) { var n = $(cfg.note); if (n) { n.textContent = text; n.className = 'puja-autosave ' + (cls || ''); } }
        function clock() { return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }); }
        function saveLocal(quiet) {
            if (!isOpen()) return;
            var snap = snapshot();
            if (!hasContent(snap)) return;
            if (!lsSet(snap)) note('Could not save on this device (browser storage is blocked).', 'warn');
            else if (!quiet && !serverTimer) note('Saved on this device ' + clock() + '.', 'ok');
        }
        function serverSave() {
            serverTimer = null;
            if (!isOpen() || vis() !== 'draft' || !nameText()) return;
            if (!navigator.onLine) { note('No internet. Your work is kept on this device and will be sent when you are back online.', 'warn'); return; }
            note('Saving draft...', '');
            Promise.resolve(window[cfg.saveFn]({ silent: true })).then(function (r) {
                if (r && r.ok) { note('Draft saved ' + clock() + '. You can leave safely.', 'ok'); dirty = false; saveLocal(true); }
                else if (r && r.error) note('Draft not saved to the server (' + r.error + '). Kept on this device.', 'warn');
            }).catch(function () { note('Draft not saved to the server. Kept on this device.', 'warn'); });
        }
        function changed() {
            if (restoring) return;
            dirty = true;
            clearTimeout(localTimer); localTimer = setTimeout(saveLocal, 500);
            if (vis() === 'draft') {
                clearTimeout(serverTimer);
                serverTimer = setTimeout(serverSave, 15000);   // 15 s after the last change
                if (!/Saving|saved/.test($(cfg.note).textContent)) note('Will save automatically...', '');
            }
        }
        ui.clearLocal = function () { lsDel(); dirty = false; clearTimeout(serverTimer); serverTimer = null; };

        /* hooks used by admin.js */
        ui.afterOpen = function (index, p) {
            var d = (p && p.detail) || {};
            clearTimeout(serverTimer); serverTimer = null; dirty = false;
            var v = d.status === 'draft' ? 'draft' : d.status === 'scheduled' ? 'scheduled' : 'public';
            if (index < 0) v = 'draft';
            $(cfg.vis).value = v;
            if (d.publishAt && isFinite(Date.parse(d.publishAt))) setPicker(cfg.publish, new Date(Date.parse(d.publishAt) + 19800000).toISOString().slice(0, 16));
            else setPicker(cfg.publish, '');
            setPicker(cfg.muhurat, p.muhurat || '');
            lastAutoDate = '';
            applyVisibility(); previews();
            note(v === 'draft' ? 'Changes are saved automatically while you type.' : 'Your typing is kept on this device. Press the button to update the website.', '');
            var snap = lsGet(), banner = $(cfg.banner);
            banner.style.display = 'none';
            if (snap && hasContent(snap) && snap.index === index && (index < 0 || snap.id === String(p.id))) {
                $(cfg.bannerText).textContent = 'You have unsaved work on this ' + cfg.noun + ' from ' + ago(snap.savedAt) + '. Restore it?';
                banner.style.display = 'flex';
                $(cfg.bannerYes).onclick = function () { applySnapshot(snap); banner.style.display = 'none'; changed(); };
                $(cfg.bannerNo).onclick = function () { lsDel(); banner.style.display = 'none'; };
            }
        };
        ui.afterList = function () {
            var n = $(cfg.listNote); if (!n) return;
            var snap = lsGet();
            if (!snap || !hasContent(snap)) { n.style.display = 'none'; return; }
            var list = window[cfg.listVar] || [], idx = snap.index;
            if (idx >= 0 && (!list[idx] || String(list[idx].id) !== snap.id)) idx = list.findIndex(function (x) { return String(x.id) === snap.id; });
            n.innerHTML = '';
            var sp = document.createElement('span');
            sp.textContent = 'Unfinished work' + (snap.name ? ' on "' + snap.name + '"' : '') + ' from ' + ago(snap.savedAt) + ' is still saved on this device.';
            var go = document.createElement('button'); go.className = 'btn btn-primary'; go.type = 'button'; go.textContent = 'Continue editing';
            go.onclick = function () {
                window[cfg.openFn](snap.index >= 0 ? idx : -1);
                setTimeout(function () { applySnapshot(snap); $(cfg.banner).style.display = 'none'; changed(); }, 0);
            };
            var no = document.createElement('button'); no.className = 'btn'; no.type = 'button'; no.textContent = 'Discard';
            no.onclick = function () { lsDel(); n.style.display = 'none'; };
            n.appendChild(sp); n.appendChild(go); n.appendChild(no); n.style.display = 'flex';
        };

        ui.init = function () {
            if (!drawer()) return;
            fillTimeSelects(cfg.publish + 'Hour', cfg.publish + 'Min');
            fillTimeSelects(cfg.muhurat + 'Hour', cfg.muhurat + 'Min');
            setPicker(cfg.publish, ''); setPicker(cfg.muhurat, '');
            $(cfg.vis).addEventListener('change', function () {
                applyVisibility(); changed();
                if (this.value !== 'draft') { clearTimeout(serverTimer); serverTimer = null; note('Your typing is kept on this device. Press the button to update the website.', ''); }
            });
            ['Date', 'Hour', 'Min', 'Ap'].forEach(function (s) {
                $(cfg.muhurat + s).addEventListener('change', function () {
                    var iso = readPicker(cfg.muhurat);
                    $(cfg.muhurat).value = iso;
                    if (cfg.autoDateId && iso) {
                        var box = $(cfg.autoDateId), auto = displayDate(iso.slice(0, 10), ($(cfg.langId) || {}).value);
                        if (box && (cfg.hideAutoDate || !box.value.trim() || box.value === lastAutoDate)) { box.value = auto; lastAutoDate = auto; }
                    }
                    refreshDateShown();
                });
            });
            /* the "date shown to visitors" box is hidden for pujas: it always follows the date picked below, in the editing language */
            function refreshDateShown() {
                if (!cfg.autoDateId) return;
                var shown = $(cfg.autoDateId + 'Shown'), box = $(cfg.autoDateId);
                if (shown) shown.textContent = (box && box.value.trim()) || '-';
            }
            if (cfg.hideAutoDate && cfg.langId && $(cfg.langId)) {
                $(cfg.langId).addEventListener('change', function () {
                    var iso = readPicker(cfg.muhurat), box = $(cfg.autoDateId);
                    if (iso && box) { box.value = displayDate(iso.slice(0, 10), $(cfg.langId).value); lastAutoDate = box.value; }
                    refreshDateShown();
                });
            }
            if (cfg.hideAutoDate && typeof window[cfg.openFn] === 'function' && !window[cfg.openFn].__dateWrapped) {
                var origOpen = window[cfg.openFn];
                window[cfg.openFn] = function () { var r = origOpen.apply(this, arguments); setTimeout(refreshDateShown, 0); setTimeout(refreshDateShown, 400); return r; };
                window[cfg.openFn].__dateWrapped = true;
            }
            var dr = drawer();
            dr.addEventListener('input', function (e) {
                var t = e.target.id;
                if ((cfg.previews || []).some(function (pv) { return pv[0] === t; })) previews();
                if (cfg.autoId && t === cfg.autoId.from && parseInt($(cfg.indexId).value, 10) < 0 && typeof window.slugId === 'function') {
                    var idEl = $(cfg.idId);
                    if (!idEl.dataset.manual) idEl.value = window.slugId($(cfg.autoId.from).value, $(cfg.autoId.lang).value);
                }
                if (t === cfg.idId) $(cfg.idId).dataset.manual = '1';
                changed();
            });
            dr.addEventListener('change', function (e) { if (e.target.type !== 'file') changed(); });
            var nb = $(cfg.newBtn);
            if (nb) nb.addEventListener('click', function () { var i = $(cfg.idId); if (i) delete i.dataset.manual; });

            var closeBtn = $(cfg.closeBtn);
            if (closeBtn) closeBtn.addEventListener('click', function () {
                saveLocal(true); clearTimeout(serverTimer); serverTimer = null;
                if (dirty && vis() === 'draft' && nameText() && navigator.onLine) {
                    Promise.resolve(window[cfg.saveFn]({ silent: true })).then(function (r) {
                        if (r && r.ok) { dirty = false; lsDel(); if (typeof window[cfg.loadFn] === 'function') window[cfg.loadFn](); }
                    });
                }
                setTimeout(ui.afterList, 50);
            });
            window.addEventListener('online', function () { if (dirty && isOpen()) { clearTimeout(serverTimer); serverTimer = setTimeout(serverSave, 500); } });
            window.addEventListener('beforeunload', function (e) {
                if (isOpen() && dirty) { saveLocal(); e.preventDefault(); e.returnValue = ''; }
            });
            document.addEventListener('visibilitychange', function () { if (document.hidden && isOpen()) saveLocal(); });

            var bar = $(cfg.filterBar);
            if (bar) bar.addEventListener('click', function (e) {
                var b = e.target.closest('button[data-f]'); if (!b) return;
                window[cfg.filterVar] = b.getAttribute('data-f');
                bar.querySelectorAll('button').forEach(function (x) { x.classList.toggle('active', x === b); });
                if (typeof window[cfg.loadFn] === 'function') window[cfg.loadFn]();
            });
        };
        return ui;
    }

    /* ---------- puja ---------- */
    var pujaUI = window.ssPujaUI = createEditor({
        noun: 'puja', drawer: 'drawer-edit-puja', vis: 'pujaVisibility', scheduleBox: 'pujaScheduleBox', publish: 'pujaPublish',
        muhurat: 'editPujaMuhurat', saveText: 'btnSavePujaText', note: 'pujaAutosaveNote',
        banner: 'pujaRestoreBanner', bannerText: 'pujaRestoreText', bannerYes: 'pujaRestoreYes', bannerNo: 'pujaRestoreNo',
        closeBtn: 'btnPujaClose', newBtn: 'btnNewPuja', listNote: 'pujaLocalDraftNote', filterBar: 'pujaStatusFilter', filterVar: '__pujaFilter',
        lsKey: 'ss_puja_draft_v1', skipId: /^pujaRestore|^pujaAutosave/, indexId: 'editPujaIndex', idId: 'editPujaId',
        nameIds: ['editPujaNameEn'], contentIds: ['editPujaNameEn', 'editPujaDescEn', 'editPujaAboutEn', 'editPujaTemple', 'editPujaImage'],
        saveFn: 'savePuja', openFn: 'openEditPuja', loadFn: 'loadPujas', listVar: 'allPujas',
        autoDateId: 'editPujaDate', hideAutoDate: true, langId: 'editPujaLang', autoId: { from: 'editPujaNameEn', lang: 'editPujaLang' },
        previews: [['editPujaDescEn', 'editPujaDescPreview'], ['editPujaAboutEn', 'editPujaAboutPreview']],
        editors: { benefits: 'editor-benefits', procedure: 'editor-procedure', receive: 'editor-receive', faqs: 'editor-faqs', gallery: 'editor-gallery' },
        restoreRow: function (t, vals, c) {
            try { window.addDynamicRow(t); } catch (e) { return; }
            var row = c.lastElementChild; if (!row) return;
            var inputs = row.querySelectorAll('input,textarea');
            vals.forEach(function (kv, i) {
                var el = inputs[i]; if (!el) return;
                el.value = kv[1];
                var pv = row.querySelector('img');
                if (pv && el.classList.contains('dyn-g')) { pv.src = kv[1]; pv.style.display = kv[1] ? 'block' : 'none'; }
            });
        },
        afterRestore: function (s) {
            var lang = $('editPujaLang'); if (lang) lang.dispatchEvent(new Event('change'));
            // the language handler re-reads the saved record; put the typed title / description back
            ['editPujaNameEn', 'editPujaDescEn'].forEach(function (id) { if (s.fields[id] != null) $(id).value = s.fields[id]; });
        }
    });

    /* ---------- package ---------- */
    var pkgUI = window.ssPackageUI = createEditor({
        noun: 'package', drawer: 'drawer-edit-package', vis: 'packageVisibility', scheduleBox: 'packageScheduleBox', publish: 'packagePublish',
        muhurat: 'editPackageMuhurat', saveText: 'btnSavePackageText', note: 'packageAutosaveNote',
        banner: 'packageRestoreBanner', bannerText: 'packageRestoreText', bannerYes: 'packageRestoreYes', bannerNo: 'packageRestoreNo',
        closeBtn: 'btnPackageClose', newBtn: 'btnNewPackage', listNote: 'packageLocalDraftNote', filterBar: 'packageStatusFilter', filterVar: '__packageFilter',
        lsKey: 'ss_package_draft_v1', skipId: /^packageRestore|^packageAutosave/, indexId: 'editPackageIndex', idId: 'editPackageId',
        nameIds: ['editPackageNameEn', 'editPackageNameTe', 'editPackageNameHi'],
        contentIds: ['editPackageNameEn', 'editPackageNameTe', 'editPackageNameHi', 'editPackageDescEn', 'editPackageAboutEn', 'editPackageTemple', 'editPackageImage'],
        saveFn: 'savePackage', openFn: 'openEditPackage', loadFn: 'loadPackages', listVar: 'allPackages',
        previews: [['editPackageDescEn', 'editPackageDescPreviewEn'], ['editPackageAboutEn', 'editPackageAboutPreviewEn'],
                   ['editPackageDescTe', 'editPackageDescPreviewTe'], ['editPackageAboutTe', 'editPackageAboutPreviewTe'],
                   ['editPackageDescHi', 'editPackageDescPreviewHi'], ['editPackageAboutHi', 'editPackageAboutPreviewHi']],
        editors: { benefits: 'package-editor-benefits', procedure: 'package-editor-procedure', receive: 'package-editor-receive', faqs: 'package-editor-faqs', gallery: 'package-editor-gallery' },
        restoreRow: function (t, vals) {
            var data = {};
            if (t === 'gallery') data = (vals[0] && vals[0][1]) || '';
            else vals.forEach(function (kv) { data[kv[0]] = kv[1]; });
            window.addPackageDetailRow(t, data);
        },
        afterRestore: function () {
            var tg = $('editPackageLangToggle');
            if (tg && typeof window.togglePackageLangs === 'function') window.togglePackageLangs(tg.value);
        }
    });

    function init() { pujaUI.init(); pkgUI.init(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
