
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.43.0' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\Profile.svelte generated by Svelte v3.43.0 */

    const file$3 = "src\\Profile.svelte";

    function create_fragment$3(ctx) {
    	let h1;
    	let t1;
    	let div0;
    	let t3;
    	let div1;
    	let t5;
    	let div2;
    	let t7;
    	let div3;
    	let t9;
    	let div4;
    	let t11;
    	let div5;
    	let t13;
    	let div6;
    	let t15;
    	let div7;
    	let t17;
    	let div8;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "My profile";
    			t1 = space();
    			div0 = element("div");
    			div0.textContent = "First name : Pimolmas";
    			t3 = space();
    			div1 = element("div");
    			div1.textContent = "Last name : Boonpluk";
    			t5 = space();
    			div2 = element("div");
    			div2.textContent = "Nick name : Toeyhorm";
    			t7 = space();
    			div3 = element("div");
    			div3.textContent = "Age : 16 years old";
    			t9 = space();
    			div4 = element("div");
    			div4.textContent = "Birthday : 7 septemder 2005";
    			t11 = space();
    			div5 = element("div");
    			div5.textContent = "Grade:10";
    			t13 = space();
    			div6 = element("div");
    			div6.textContent = "Studying : Tripatschool";
    			t15 = space();
    			div7 = element("div");
    			div7.textContent = "Hobby : Swimming ,Drawing";
    			t17 = space();
    			div8 = element("div");
    			div8.textContent = "Skills :Swimming,Sailing,Dance";
    			attr_dev(h1, "class", "svelte-c5dwla");
    			add_location(h1, file$3, 0, 0, 0);
    			add_location(div0, file$3, 2, 0, 23);
    			add_location(div1, file$3, 3, 4, 61);
    			add_location(div2, file$3, 4, 4, 98);
    			add_location(div3, file$3, 5, 4, 135);
    			add_location(div4, file$3, 6, 1, 167);
    			add_location(div5, file$3, 7, 1, 208);
    			add_location(div6, file$3, 8, 1, 230);
    			add_location(div7, file$3, 9, 1, 267);
    			add_location(div8, file$3, 10, 1, 307);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, div1, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, div2, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, div3, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, div4, anchor);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, div5, anchor);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, div6, anchor);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, div7, anchor);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, div8, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(div2);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(div3);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(div4);
    			if (detaching) detach_dev(t11);
    			if (detaching) detach_dev(div5);
    			if (detaching) detach_dev(t13);
    			if (detaching) detach_dev(div6);
    			if (detaching) detach_dev(t15);
    			if (detaching) detach_dev(div7);
    			if (detaching) detach_dev(t17);
    			if (detaching) detach_dev(div8);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Profile', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Profile> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Profile extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Profile",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\Project.svelte generated by Svelte v3.43.0 */

    const file$2 = "src\\Project.svelte";

    function create_fragment$2(ctx) {
    	let p;
    	let t1;
    	let img0;
    	let img0_src_value;
    	let t2;
    	let img1;
    	let img1_src_value;
    	let t3;
    	let img2;
    	let img2_src_value;
    	let t4;
    	let img3;
    	let img3_src_value;
    	let t5;
    	let img4;
    	let img4_src_value;
    	let t6;
    	let img5;
    	let img5_src_value;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "This is a project I've been working on";
    			t1 = space();
    			img0 = element("img");
    			t2 = space();
    			img1 = element("img");
    			t3 = space();
    			img2 = element("img");
    			t4 = space();
    			img3 = element("img");
    			t5 = space();
    			img4 = element("img");
    			t6 = space();
    			img5 = element("img");
    			attr_dev(p, "class", "svelte-1f2u4jt");
    			add_location(p, file$2, 0, 0, 0);
    			if (!src_url_equal(img0.src, img0_src_value = "img/ว่าว1.jpg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "my");
    			attr_dev(img0, "width", "390");
    			add_location(img0, file$2, 1, 4, 51);
    			if (!src_url_equal(img1.src, img1_src_value = "img/ว่าว2.jpg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "my");
    			attr_dev(img1, "width", "390");
    			add_location(img1, file$2, 2, 1, 100);
    			if (!src_url_equal(img2.src, img2_src_value = "img/ว่าว3.jpg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "my");
    			attr_dev(img2, "width", "390");
    			add_location(img2, file$2, 3, 1, 149);
    			if (!src_url_equal(img3.src, img3_src_value = "img/ว่าว4.jpg")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "my");
    			attr_dev(img3, "width", "390");
    			add_location(img3, file$2, 4, 1, 198);
    			if (!src_url_equal(img4.src, img4_src_value = "img/ว่าว5.jpg")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "alt", "my");
    			attr_dev(img4, "width", "390");
    			add_location(img4, file$2, 5, 1, 247);
    			if (!src_url_equal(img5.src, img5_src_value = "img/ว่าว6.jpg")) attr_dev(img5, "src", img5_src_value);
    			attr_dev(img5, "alt", "my");
    			attr_dev(img5, "width", "490");
    			add_location(img5, file$2, 6, 1, 296);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, img0, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, img1, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, img2, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, img3, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, img4, anchor);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, img5, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(img0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(img1);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(img2);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(img3);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(img4);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(img5);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Project', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Project> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Project extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Project",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\Activity.svelte generated by Svelte v3.43.0 */

    const file$1 = "src\\Activity.svelte";

    function create_fragment$1(ctx) {
    	let p;
    	let t1;
    	let h20;
    	let t3;
    	let h30;
    	let t5;
    	let img0;
    	let img0_src_value;
    	let t6;
    	let img1;
    	let img1_src_value;
    	let t7;
    	let img2;
    	let img2_src_value;
    	let t8;
    	let video0;
    	let source0;
    	let source0_src_value;
    	let t9;
    	let h31;
    	let h32;
    	let a0;
    	let t12;
    	let img3;
    	let img3_src_value;
    	let t13;
    	let img4;
    	let img4_src_value;
    	let t14;
    	let img5;
    	let img5_src_value;
    	let t15;
    	let video1;
    	let source1;
    	let source1_src_value;
    	let t16;
    	let h33;
    	let h34;
    	let a1;
    	let t19;
    	let h21;
    	let t21;
    	let h35;
    	let t23;
    	let img6;
    	let img6_src_value;
    	let t24;
    	let img7;
    	let img7_src_value;
    	let t25;
    	let img8;
    	let img8_src_value;
    	let t26;
    	let h22;
    	let t28;
    	let h36;
    	let t30;
    	let img9;
    	let img9_src_value;
    	let t31;
    	let img10;
    	let img10_src_value;
    	let t32;
    	let img11;
    	let img11_src_value;
    	let t33;
    	let h23;
    	let t35;
    	let h37;
    	let t37;
    	let img12;
    	let img12_src_value;
    	let t38;
    	let img13;
    	let img13_src_value;
    	let t39;
    	let img14;
    	let img14_src_value;
    	let t40;
    	let img15;
    	let img15_src_value;
    	let t41;
    	let h24;
    	let t43;
    	let h38;
    	let t45;
    	let img16;
    	let img16_src_value;
    	let t46;
    	let img17;
    	let img17_src_value;
    	let t47;
    	let img18;
    	let img18_src_value;
    	let t48;
    	let img19;
    	let img19_src_value;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Activities I have participated in";
    			t1 = space();
    			h20 = element("h2");
    			h20.textContent = "Dance";
    			t3 = space();
    			h30 = element("h3");
    			h30.textContent = "Here are all my pictures and clips of Thai dances and dances.";
    			t5 = space();
    			img0 = element("img");
    			t6 = space();
    			img1 = element("img");
    			t7 = space();
    			img2 = element("img");
    			t8 = space();
    			video0 = element("video");
    			source0 = element("source");
    			t9 = space();
    			h31 = element("h3");
    			h31.textContent = "See full clip";
    			h32 = element("h3");
    			a0 = element("a");
    			a0.textContent = "My thai dance clip";
    			t12 = space();
    			img3 = element("img");
    			t13 = space();
    			img4 = element("img");
    			t14 = space();
    			img5 = element("img");
    			t15 = space();
    			video1 = element("video");
    			source1 = element("source");
    			t16 = space();
    			h33 = element("h3");
    			h33.textContent = "See full clip";
    			h34 = element("h3");
    			a1 = element("a");
    			a1.textContent = "My dance clip";
    			t19 = space();
    			h21 = element("h2");
    			h21.textContent = "Swimming";
    			t21 = space();
    			h35 = element("h3");
    			h35.textContent = "This is the award I received from the swimming competition";
    			t23 = space();
    			img6 = element("img");
    			t24 = space();
    			img7 = element("img");
    			t25 = space();
    			img8 = element("img");
    			t26 = space();
    			h22 = element("h2");
    			h22.textContent = "Darma";
    			t28 = space();
    			h36 = element("h3");
    			h36.textContent = "This is my theatrical photo";
    			t30 = space();
    			img9 = element("img");
    			t31 = space();
    			img10 = element("img");
    			t32 = space();
    			img11 = element("img");
    			t33 = space();
    			h23 = element("h2");
    			h23.textContent = "Sailing";
    			t35 = space();
    			h37 = element("h3");
    			h37.textContent = "Here's a picture of me from the sailing event";
    			t37 = space();
    			img12 = element("img");
    			t38 = space();
    			img13 = element("img");
    			t39 = space();
    			img14 = element("img");
    			t40 = space();
    			img15 = element("img");
    			t41 = space();
    			h24 = element("h2");
    			h24.textContent = "Pantomime";
    			t43 = space();
    			h38 = element("h3");
    			h38.textContent = "Here's a picture of me doing a pantomime";
    			t45 = space();
    			img16 = element("img");
    			t46 = space();
    			img17 = element("img");
    			t47 = space();
    			img18 = element("img");
    			t48 = space();
    			img19 = element("img");
    			attr_dev(p, "class", "svelte-1sp59vj");
    			add_location(p, file$1, 0, 0, 0);
    			add_location(h20, file$1, 1, 0, 42);
    			add_location(h30, file$1, 2, 0, 58);
    			if (!src_url_equal(img0.src, img0_src_value = "img/รำ1.jpg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "my");
    			attr_dev(img0, "width", "390");
    			add_location(img0, file$1, 3, 0, 130);
    			if (!src_url_equal(img1.src, img1_src_value = "img/รำ2.jpg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "my");
    			attr_dev(img1, "width", "390");
    			add_location(img1, file$1, 4, 0, 176);
    			if (!src_url_equal(img2.src, img2_src_value = "img/รำ3.jpg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "my");
    			attr_dev(img2, "width", "390");
    			add_location(img2, file$1, 5, 0, 222);
    			if (!src_url_equal(source0.src, source0_src_value = "img\\แห่เทียน3.mp4")) attr_dev(source0, "src", source0_src_value);
    			add_location(source0, file$1, 8, 1, 369);
    			video0.controls = true;
    			video0.autoplay = true;
    			attr_dev(video0, "width", "720");
    			attr_dev(video0, "height", "640");
    			add_location(video0, file$1, 7, 0, 315);
    			add_location(h31, file$1, 11, 0, 418);
    			attr_dev(a0, "href", "https://www.youtube.com/watch?v=gGmDI4EqHME");
    			attr_dev(a0, "target", "_blank");
    			add_location(a0, file$1, 11, 26, 444);
    			add_location(h32, file$1, 11, 22, 440);
    			if (!src_url_equal(img3.src, img3_src_value = "img/dance1.jpg")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "my");
    			attr_dev(img3, "width", "390");
    			add_location(img3, file$1, 14, 2, 552);
    			if (!src_url_equal(img4.src, img4_src_value = "img/dance2.jpg")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "alt", "my");
    			attr_dev(img4, "width", "390");
    			add_location(img4, file$1, 15, 2, 603);
    			if (!src_url_equal(img5.src, img5_src_value = "img/dance3.jpg")) attr_dev(img5, "src", img5_src_value);
    			attr_dev(img5, "alt", "my");
    			attr_dev(img5, "width", "390");
    			add_location(img5, file$1, 16, 2, 654);
    			if (!src_url_equal(source1.src, source1_src_value = "img\\เวทีดาว1.mp4")) attr_dev(source1, "src", source1_src_value);
    			add_location(source1, file$1, 19, 1, 808);
    			video1.controls = true;
    			video1.autoplay = true;
    			attr_dev(video1, "width", "720");
    			attr_dev(video1, "height", "640");
    			add_location(video1, file$1, 18, 2, 754);
    			add_location(h33, file$1, 21, 2, 854);
    			attr_dev(a1, "href", "https://www.youtube.com/watch?v=mnJTgas3574&t=28s");
    			attr_dev(a1, "target", "_blank");
    			add_location(a1, file$1, 21, 28, 880);
    			add_location(h34, file$1, 21, 24, 876);
    			add_location(h21, file$1, 23, 0, 986);
    			add_location(h35, file$1, 24, 0, 1005);
    			if (!src_url_equal(img6.src, img6_src_value = "img/รางวัล.jpg")) attr_dev(img6, "src", img6_src_value);
    			attr_dev(img6, "alt", "my");
    			attr_dev(img6, "width", "390");
    			add_location(img6, file$1, 25, 1, 1075);
    			if (!src_url_equal(img7.src, img7_src_value = "img/รางวัล2.jpg")) attr_dev(img7, "src", img7_src_value);
    			attr_dev(img7, "alt", "my");
    			attr_dev(img7, "width", "390");
    			add_location(img7, file$1, 26, 1, 1125);
    			if (!src_url_equal(img8.src, img8_src_value = "img/รางวัล3.jpg")) attr_dev(img8, "src", img8_src_value);
    			attr_dev(img8, "alt", "my");
    			attr_dev(img8, "width", "490");
    			add_location(img8, file$1, 27, 1, 1176);
    			add_location(h22, file$1, 29, 0, 1228);
    			add_location(h36, file$1, 30, 0, 1244);
    			if (!src_url_equal(img9.src, img9_src_value = "img/ละคร1.jpg")) attr_dev(img9, "src", img9_src_value);
    			attr_dev(img9, "alt", "my");
    			attr_dev(img9, "width", "390");
    			add_location(img9, file$1, 31, 0, 1282);
    			if (!src_url_equal(img10.src, img10_src_value = "img/ละคร4.jpg")) attr_dev(img10, "src", img10_src_value);
    			attr_dev(img10, "alt", "my");
    			attr_dev(img10, "width", "390");
    			add_location(img10, file$1, 32, 0, 1330);
    			if (!src_url_equal(img11.src, img11_src_value = "img/ละคร3.jpg")) attr_dev(img11, "src", img11_src_value);
    			attr_dev(img11, "alt", "my");
    			attr_dev(img11, "width", "390");
    			add_location(img11, file$1, 33, 0, 1378);
    			add_location(h23, file$1, 36, 0, 1430);
    			add_location(h37, file$1, 37, 0, 1448);
    			if (!src_url_equal(img12.src, img12_src_value = "img/เรือใบ3.jpg")) attr_dev(img12, "src", img12_src_value);
    			attr_dev(img12, "alt", "my");
    			attr_dev(img12, "width", "390");
    			add_location(img12, file$1, 38, 0, 1504);
    			if (!src_url_equal(img13.src, img13_src_value = "img/เรือใบ4.jpg")) attr_dev(img13, "src", img13_src_value);
    			attr_dev(img13, "alt", "my");
    			attr_dev(img13, "width", "390");
    			add_location(img13, file$1, 39, 0, 1554);
    			if (!src_url_equal(img14.src, img14_src_value = "img/เรือใบ1.jpg")) attr_dev(img14, "src", img14_src_value);
    			attr_dev(img14, "alt", "my");
    			attr_dev(img14, "width", "390");
    			add_location(img14, file$1, 40, 0, 1604);
    			if (!src_url_equal(img15.src, img15_src_value = "img/เรือใบ2.jpg")) attr_dev(img15, "src", img15_src_value);
    			attr_dev(img15, "alt", "my");
    			attr_dev(img15, "width", "390");
    			add_location(img15, file$1, 41, 0, 1654);
    			add_location(h24, file$1, 43, 0, 1706);
    			add_location(h38, file$1, 44, 0, 1726);
    			if (!src_url_equal(img16.src, img16_src_value = "img/ใบ้1.jpg")) attr_dev(img16, "src", img16_src_value);
    			attr_dev(img16, "alt", "my");
    			attr_dev(img16, "width", "390");
    			add_location(img16, file$1, 45, 0, 1777);
    			if (!src_url_equal(img17.src, img17_src_value = "img/ใบ้2.jpg")) attr_dev(img17, "src", img17_src_value);
    			attr_dev(img17, "alt", "my");
    			attr_dev(img17, "width", "390");
    			add_location(img17, file$1, 46, 0, 1824);
    			if (!src_url_equal(img18.src, img18_src_value = "img/ใบ้3.jpg")) attr_dev(img18, "src", img18_src_value);
    			attr_dev(img18, "alt", "my");
    			attr_dev(img18, "width", "390");
    			add_location(img18, file$1, 47, 0, 1871);
    			if (!src_url_equal(img19.src, img19_src_value = "img/ใบ้4.jpg")) attr_dev(img19, "src", img19_src_value);
    			attr_dev(img19, "alt", "my");
    			attr_dev(img19, "width", "390");
    			add_location(img19, file$1, 48, 0, 1918);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, h20, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, h30, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, img0, anchor);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, img1, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, img2, anchor);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, video0, anchor);
    			append_dev(video0, source0);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, h31, anchor);
    			insert_dev(target, h32, anchor);
    			append_dev(h32, a0);
    			insert_dev(target, t12, anchor);
    			insert_dev(target, img3, anchor);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, img4, anchor);
    			insert_dev(target, t14, anchor);
    			insert_dev(target, img5, anchor);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, video1, anchor);
    			append_dev(video1, source1);
    			insert_dev(target, t16, anchor);
    			insert_dev(target, h33, anchor);
    			insert_dev(target, h34, anchor);
    			append_dev(h34, a1);
    			insert_dev(target, t19, anchor);
    			insert_dev(target, h21, anchor);
    			insert_dev(target, t21, anchor);
    			insert_dev(target, h35, anchor);
    			insert_dev(target, t23, anchor);
    			insert_dev(target, img6, anchor);
    			insert_dev(target, t24, anchor);
    			insert_dev(target, img7, anchor);
    			insert_dev(target, t25, anchor);
    			insert_dev(target, img8, anchor);
    			insert_dev(target, t26, anchor);
    			insert_dev(target, h22, anchor);
    			insert_dev(target, t28, anchor);
    			insert_dev(target, h36, anchor);
    			insert_dev(target, t30, anchor);
    			insert_dev(target, img9, anchor);
    			insert_dev(target, t31, anchor);
    			insert_dev(target, img10, anchor);
    			insert_dev(target, t32, anchor);
    			insert_dev(target, img11, anchor);
    			insert_dev(target, t33, anchor);
    			insert_dev(target, h23, anchor);
    			insert_dev(target, t35, anchor);
    			insert_dev(target, h37, anchor);
    			insert_dev(target, t37, anchor);
    			insert_dev(target, img12, anchor);
    			insert_dev(target, t38, anchor);
    			insert_dev(target, img13, anchor);
    			insert_dev(target, t39, anchor);
    			insert_dev(target, img14, anchor);
    			insert_dev(target, t40, anchor);
    			insert_dev(target, img15, anchor);
    			insert_dev(target, t41, anchor);
    			insert_dev(target, h24, anchor);
    			insert_dev(target, t43, anchor);
    			insert_dev(target, h38, anchor);
    			insert_dev(target, t45, anchor);
    			insert_dev(target, img16, anchor);
    			insert_dev(target, t46, anchor);
    			insert_dev(target, img17, anchor);
    			insert_dev(target, t47, anchor);
    			insert_dev(target, img18, anchor);
    			insert_dev(target, t48, anchor);
    			insert_dev(target, img19, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(h20);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(h30);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(img0);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(img1);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(img2);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(video0);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(h31);
    			if (detaching) detach_dev(h32);
    			if (detaching) detach_dev(t12);
    			if (detaching) detach_dev(img3);
    			if (detaching) detach_dev(t13);
    			if (detaching) detach_dev(img4);
    			if (detaching) detach_dev(t14);
    			if (detaching) detach_dev(img5);
    			if (detaching) detach_dev(t15);
    			if (detaching) detach_dev(video1);
    			if (detaching) detach_dev(t16);
    			if (detaching) detach_dev(h33);
    			if (detaching) detach_dev(h34);
    			if (detaching) detach_dev(t19);
    			if (detaching) detach_dev(h21);
    			if (detaching) detach_dev(t21);
    			if (detaching) detach_dev(h35);
    			if (detaching) detach_dev(t23);
    			if (detaching) detach_dev(img6);
    			if (detaching) detach_dev(t24);
    			if (detaching) detach_dev(img7);
    			if (detaching) detach_dev(t25);
    			if (detaching) detach_dev(img8);
    			if (detaching) detach_dev(t26);
    			if (detaching) detach_dev(h22);
    			if (detaching) detach_dev(t28);
    			if (detaching) detach_dev(h36);
    			if (detaching) detach_dev(t30);
    			if (detaching) detach_dev(img9);
    			if (detaching) detach_dev(t31);
    			if (detaching) detach_dev(img10);
    			if (detaching) detach_dev(t32);
    			if (detaching) detach_dev(img11);
    			if (detaching) detach_dev(t33);
    			if (detaching) detach_dev(h23);
    			if (detaching) detach_dev(t35);
    			if (detaching) detach_dev(h37);
    			if (detaching) detach_dev(t37);
    			if (detaching) detach_dev(img12);
    			if (detaching) detach_dev(t38);
    			if (detaching) detach_dev(img13);
    			if (detaching) detach_dev(t39);
    			if (detaching) detach_dev(img14);
    			if (detaching) detach_dev(t40);
    			if (detaching) detach_dev(img15);
    			if (detaching) detach_dev(t41);
    			if (detaching) detach_dev(h24);
    			if (detaching) detach_dev(t43);
    			if (detaching) detach_dev(h38);
    			if (detaching) detach_dev(t45);
    			if (detaching) detach_dev(img16);
    			if (detaching) detach_dev(t46);
    			if (detaching) detach_dev(img17);
    			if (detaching) detach_dev(t47);
    			if (detaching) detach_dev(img18);
    			if (detaching) detach_dev(t48);
    			if (detaching) detach_dev(img19);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Activity', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Activity> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Activity extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Activity",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.43.0 */
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let h10;
    	let t1;
    	let h11;
    	let t3;
    	let img0;
    	let img0_src_value;
    	let t4;
    	let profile;
    	let t5;
    	let project;
    	let t6;
    	let activity;
    	let t7;
    	let h20;
    	let t9;
    	let img1;
    	let img1_src_value;
    	let t10;
    	let h21;
    	let a0;
    	let t12;
    	let img2;
    	let img2_src_value;
    	let t13;
    	let h22;
    	let a1;
    	let current;
    	profile = new Profile({ $$inline: true });
    	project = new Project({ $$inline: true });
    	activity = new Activity({ $$inline: true });

    	const block = {
    		c: function create() {
    			h10 = element("h1");
    			h10.textContent = "สวัสดี my name is Toeyhorm!";
    			t1 = space();
    			h11 = element("h1");
    			h11.textContent = "my name is Toeyhorm";
    			t3 = space();
    			img0 = element("img");
    			t4 = space();
    			create_component(profile.$$.fragment);
    			t5 = space();
    			create_component(project.$$.fragment);
    			t6 = space();
    			create_component(activity.$$.fragment);
    			t7 = space();
    			h20 = element("h2");
    			h20.textContent = "You can follow me at";
    			t9 = space();
    			img1 = element("img");
    			t10 = space();
    			h21 = element("h2");
    			a0 = element("a");
    			a0.textContent = "Instagram";
    			t12 = space();
    			img2 = element("img");
    			t13 = space();
    			h22 = element("h2");
    			a1 = element("a");
    			a1.textContent = "Tiktok";
    			add_location(h10, file, 8, 0, 182);
    			add_location(h11, file, 9, 0, 219);
    			if (!src_url_equal(img0.src, img0_src_value = "img/รูปเตยยยย.jpg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "my");
    			attr_dev(img0, "width", "590");
    			add_location(img0, file, 10, 0, 248);
    			add_location(h20, file, 15, 0, 335);
    			if (!src_url_equal(img1.src, img1_src_value = "img/ig.jpg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "width", "10%");
    			attr_dev(img1, "alt", "my");
    			add_location(img1, file, 16, 0, 365);
    			attr_dev(a0, "href", "https://www.instagram.com/my_love_toey/");
    			add_location(a0, file, 17, 4, 413);
    			add_location(h21, file, 17, 0, 409);
    			if (!src_url_equal(img2.src, img2_src_value = "img/tiktok.jpg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "width", "10%");
    			attr_dev(img2, "alt", "my");
    			add_location(img2, file, 18, 1, 483);
    			attr_dev(a1, "href", "https://www.tiktok.com/@pandanusth?is_copy_url=1&is_from_webapp=v1⟨=th-TH");
    			add_location(a1, file, 19, 4, 535);
    			add_location(h22, file, 19, 0, 531);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h10, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, h11, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, img0, anchor);
    			insert_dev(target, t4, anchor);
    			mount_component(profile, target, anchor);
    			insert_dev(target, t5, anchor);
    			mount_component(project, target, anchor);
    			insert_dev(target, t6, anchor);
    			mount_component(activity, target, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, h20, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, img1, anchor);
    			insert_dev(target, t10, anchor);
    			insert_dev(target, h21, anchor);
    			append_dev(h21, a0);
    			insert_dev(target, t12, anchor);
    			insert_dev(target, img2, anchor);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, h22, anchor);
    			append_dev(h22, a1);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(profile.$$.fragment, local);
    			transition_in(project.$$.fragment, local);
    			transition_in(activity.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(profile.$$.fragment, local);
    			transition_out(project.$$.fragment, local);
    			transition_out(activity.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h10);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(h11);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(img0);
    			if (detaching) detach_dev(t4);
    			destroy_component(profile, detaching);
    			if (detaching) detach_dev(t5);
    			destroy_component(project, detaching);
    			if (detaching) detach_dev(t6);
    			destroy_component(activity, detaching);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(h20);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(img1);
    			if (detaching) detach_dev(t10);
    			if (detaching) detach_dev(h21);
    			if (detaching) detach_dev(t12);
    			if (detaching) detach_dev(img2);
    			if (detaching) detach_dev(t13);
    			if (detaching) detach_dev(h22);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let name = 'my name is Toeyhorm';
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ name, Profile, Project, Activity });

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) name = $$props.name;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
