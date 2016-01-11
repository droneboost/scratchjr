var Page = function (id, data, fcn) {
    var container = ScratchJr.stage.pagesdiv;
    this.div = newHTML('div', 'stagepage', container); // newDiv(container,0,0, 480, 360, {position: 'absolute'});
    this.div.owner = this;
    this.id = id;
    this.textstartat = 36;
    this.div.setAttribute('id', this.id);
    ScratchJr.stage.currentPage = this;
    this.num = data ? data.num : ScratchJr.stage.pages.length + 1;
    this.sprites = JSON.stringify([]);
    this.bkg = newDiv(this.div, 0, 0, 480, 360, {
        position: 'absolute',
        background: ScratchJr.stagecolor
    });
    this.bkg.type = 'background';
    ScratchJr.stage.pages.push(this);
    if (!data) {
        this.emptyPage();
    } else {
        this.loadPageData(data, fcn);
    }
};

Page.prototype.loadPageData = function (data, fcn) {
    this.currentSpriteName = data.lastSprite;
    if (data.textstartat) {
        this.textstartat = Number(data.textstartat);
    }
    if (data.md5 && (data.md5 != 'undefined')) {
        Project.mediaCount++;
        this.setBackground(data.md5, checkBkgDone);
    } else {
        this.clearBackground();
    }
    var list = data.sprites;
    for (var j = 0; j < list.length; j++) {
        Project.recreateObject(this, list[j], data[list[j]], checkCount);
    }
    for (var i = 0; i < data.layers.length; i++) {
        var obj = gn(data.layers[i]);
        if (obj) {
            this.div.appendChild(obj);
        }
    }
    function checkCount () {
        if (!fcn) {
            return;
        }
        if (Project.mediaCount < 1) {
            fcn();
        }
    }

    function checkBkgDone () {
        Project.substractCount();
        if (!fcn) {
            return;
        }
        if (Project.mediaCount < 1) {
            fcn();
        }
    }
};

Page.prototype.emptyPage = function () {
    this.clearBackground();
    this.createCat();
};

Page.prototype.setCurrentSprite = function (spr) { // set the sprite and toggles UI if no sprite is available
    if (ScratchJr.getSprite()) {
        ScratchJr.getSprite().unselect();
    }
    if (spr) {
        this.currentSpriteName = spr.id;
        spr.div.style.visibility = 'visible';
        Palette.show();
        gn('scripts').style.display = ScratchJr.inFullscreen ? 'none' : 'block';
        spr.activate();
    } else {
        this.currentSpriteName = undefined;
        Palette.hide();
        gn('scripts').style.display = 'none';
    }
};

Page.prototype.clearBackground = function () {
    while (this.bkg.childElementCount > 0) {
        this.bkg.removeChild(this.bkg.childNodes[0]);
    }
};

Page.prototype.setBackground = function (name, fcn) {
    if (name == 'undefined') {
        return;
    }
    this.clearBackground();
    this.md5 = undefined;
    if (name == 'none') {
        if (fcn) {
            fcn();
        }
        return;
    }
    this.md5 = name;
    if (!name) {
        return;
    }
    var me = this;
    var url = (MediaLib.keys[name]) ? MediaLib.path + name : (name.indexOf('/') < 0) ? iOS.path + name : name;
    var md5 = (MediaLib.keys[name]) ? MediaLib.path + name : name;

    if (md5.substr(md5.length - 3) == 'png') {
        this.setBackgroundImage(url, fcn);
        this.svg = null;
        return;
    }

    if (md5.indexOf('/') > -1) {
        IO.requestFromServer(md5, doNext);
    } else {
        iOS.getmedia(md5, nextStep);
    }
    function nextStep (base64) {
        doNext(atob(base64));
    }
    function doNext (str) {
        str = str.replace(/>\s*</g, '><');
        me.setSVG(str);
        if ((str.indexOf('xlink:href') < 0) && iOS.path) {
            me.setBackgroundImage(url, fcn); // does not have embedded images
        } else {
            var base64 = IO.getImageDataURL(me.md5, btoa(str));
            IO.getImagesInSVG(str, function () {
                me.setBackgroundImage(base64, fcn);
            });
        }
    }
};

Page.prototype.setSVG = function (str) {
    var xmlDoc = new DOMParser().parseFromString(str, 'text/xml');
    var extxml = document.importNode(xmlDoc.documentElement, true);
    if (extxml.childNodes[0].nodeName == '#comment') {
        extxml.removeChild(extxml.childNodes[0]);
    }
    this.svg = extxml;
};

Page.prototype.setBackgroundImage = function (url, fcn) {
    var img = document.createElement('img');
    img.src = url;
    this.bkg.originalImg = img.cloneNode(false);
    this.bkg.appendChild(img);
    setProps(img.style, {
        position: 'absolute',
        left: '0px',
        top: '0px',
        width: '100%',
        height: '100%'
    });
    this.bkg.img = img;
    if (!img.complete) {
        img.onload = function () {
            if (gn('backdrop').className == 'modal-backdrop fade in') {
                Project.setProgress(Project.getMediaLoadRatio(70));
            }
            if (fcn) {
                fcn();
            }
        };
    } else {
        if (gn('backdrop').className == 'modal-backdrop fade in') {
            Project.setProgress(Project.getMediaLoadRatio(70));
        }
        if (fcn) {
            fcn();
        }
    }
};

Page.prototype.setPageSprites = function (showstate) {
    var list = JSON.parse(this.sprites);
    for (var i = 0; i < list.length; i++) {
        gn(list[i]).style.visibility = showstate;
    }
};

Page.prototype.redoChangeBkg = function (data) {
    var me = this;
    var md5 = data[this.id].md5 ? data[this.id].md5 : 'none';
    this.setBackground(md5, me.updateThumb);
};

//////////////////////////////////////
// page thumbnail
/////////////////////////////////////

Page.prototype.updateThumb = function (page) {
    var me = page ? page : ScratchJr.stage.currentPage;
    if (!me.thumbnail) {
        return;
    }
    var c = me.thumbnail.childNodes[0].childNodes[0];
    me.setPageThumb(c);
};

Page.prototype.pageThumbnail = function (p) {
    var tb = newHTML('div', 'pagethumb', p);
    tb.setAttribute('id', getIdFor('pagethumb'));
    tb.owner = this.id;
    tb.type = 'pagethumb';
    var container = newHTML('div', 'pc-container', tb);
    var c = newHTML('canvas', 'pc', container);
    this.setPageThumb(c);
    var num = newHTML('div', 'pagenum', tb);
    var pq = newHTML('p', undefined, num);
    pq.textContent = this.num;
    newHTML('div', 'deletethumb', tb);
    if (isTablet) {
        tb.ontouchstart = function (evt) {
            Thumbs.pageMouseDown(evt);
        };
    } else {
        tb.onmousedown = function (evt) {
            Thumbs.pageMouseDown(evt);
        };
    }
    this.thumbnail = tb;
    return tb;
};

Page.prototype.setPageThumb = function (c) {
    var w0, h0;
    if (Settings.edition == 'PBS') {
        w0 = 136;
        h0 = 101;
    } else {
        w0 = 132;
        h0 = 99;
    }
    setCanvasSizeScaledToWindowDocumentHeight(c, w0, h0);
    var w = c.width;
    var h = c.height;
    var ctx = c.getContext('2d');

    if (Settings.edition == 'PBS') {

        ctx.rect(0, 0, w, h);
        ctx.fillStyle = '#fff';
        ctx.fill();
    } else {
        ctx.drawImage(BlockSpecs.canvasMask, 0, 0, w, h);
    }
    if (this.bkg.childElementCount > 0) {
        var img = this.bkg.originalImg;
        var imgw = img.naturalWidth ? img.naturalWidth : img.width;
        var imgh = img.naturalHeight ? img.naturalHeight : img.height;
        ctx.drawImage(img, 0, 0, imgw, imgh, 0, 0, w, h);
    }
    var scale = w / 480;
    for (var i = 0; i < this.div.childElementCount; i++) {
        var spr = this.div.childNodes[i].owner;
        if (!spr) {
            continue;
        }
        this.stampSpriteAt(ctx, spr, scale);
    }
    if (Settings.edition != 'PBS') {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(BlockSpecs.canvasMask, 0, 0, w, h);
        ctx.restore();
    }
};

Page.prototype.stampSpriteAt = function (ctx, spr, scale) {
    if (!spr.shown) {
        return;
    }
    var img = (spr.type == 'sprite') ? spr.originalImg : spr.outline;
    this.drawSpriteImage(ctx, img, spr, scale);
};

Page.prototype.drawSpriteImage = function (ctx, img, spr, scale) {
    if (!spr.shown) {
        return;
    }
    if (!img) {
        return;
    }
    var imgw = img.naturalWidth ? img.naturalWidth : img.width;
    var imgh = img.naturalHeight ? img.naturalHeight : img.height;
    var sw = imgw * spr.scale;
    var sh = imgh * spr.scale;
    ctx.save();
    var pt = {
        x: spr.cx * spr.scale * scale,
        y: spr.cy * spr.scale * scale
    };
    ctx.translate(pt.x, pt.y);
    ctx.rotate(spr.angle * DEGTOR);
    ctx.translate(-pt.x, -pt.y);
    if (spr.flip) {
        ctx.scale(-1, 1);
        ctx.translate(-img.width * scale * spr.scale, 0);
    }
    var mtx = this.getMatrixFor(spr, scale);
    var pos = Vector.floor(mtx.transformPoint({
        x: Math.floor(spr.screenLeft() * scale),
        y: Math.floor(spr.screenTop() * scale)
    }));
    ctx.drawImage(img, 0, 0, imgw, imgh, pos.x, pos.y, Math.floor(sw * scale), Math.floor(sh * scale));
    ctx.restore();
};

Page.prototype.getMatrixFor = function (spr) {
    var sx = new Matrix();
    var angle = spr.angle ? -spr.angle : 0;
    if (spr.flip) {
        sx.a = -1;
        sx.d = 1;
    }
    var rx = new Matrix();
    rx.rotate(angle);
    return sx.multiply(rx);
};

/////////////////////
// Saving
/////////////////////

Page.prototype.encodePage = function () {
    var p = this.div;
    var spritelist = JSON.parse(this.sprites);
    var data = {};
    data.textstartat = this.textstartat;
    data.sprites = spritelist;
    var md5 = this.md5;
    if (md5) {
        data.md5 = md5;
    }
    data.num = this.num;
    this.currentSpriteName = !this.currentSpriteName ?
        undefined : (gn(this.currentSpriteName).owner.type == 'sprite') ? this.currentSpriteName : this.getSprites()[0];
    data.lastSprite = this.currentSpriteName;
    for (var j = 0; j < spritelist.length; j++) {
        data[spritelist[j]] = Project.encodeSprite(spritelist[j]);
    }
    var layers = [];
    for (var i = 1; i < p.childElementCount; i++) {
        var layerid = p.childNodes[i].id;
        if (layerid && (layerid != '')) {
            layers.push(layerid);
        }
    }
    data.layers = layers;
    return data;
};

Page.prototype.getSprites = function () {
    var spritelist = JSON.parse(this.sprites);
    var res = [];
    for (var i = 0; i < spritelist.length; i++) {
        if (gn(spritelist[i]).owner.type == 'sprite') {
            res.push(spritelist[i]);
        }
    }
    return res;
};


/////////////////////////////
// Object creation
/////////////////////////////

Page.prototype.createText = function () {
    var textAttr = {
        shown: true,
        type: 'text',
        scale: 1,
        defaultScale: 1,
        speed: 2,
        dirx: 1,
        diry: 1,
        angle: 0,
        homex: 240,
        homey: this.textstartat,
        xcoor: 240,
        ycoor: this.textstartat,
        str: '',
        color: BlockSpecs.fontcolors[BlockSpecs.fontcolors.length - 1],
        fontsize: 36,
        cx: 0,
        cy: (32 * 1.35 / 2),
        w: 0,
        h: 36 * 1.35
    };
    textAttr.page = this;
    textAttr.id = getIdFor('Text');
    new Sprite(textAttr);
};

Page.prototype.createCat = function () {
    var sprAttr = UI.mascotData(ScratchJr.stage.currentPage);
    Project.mediaCount++;
    var me = this;
    new Sprite(sprAttr, me.pageAdded);
};

Page.prototype.update = function (spr) {
    if (spr) {
        Undo.record({
            action: 'modify',
            where: this.id,
            who: spr.id
        });
    } else {
        Undo.record({
            action: 'recreatepage',
            where: this.id,
            who: this.id
        });
    }
    if (spr) {
        Thumbs.updateSprite(spr);
    } else {
        Thumbs.updateSprites();
    }
    Thumbs.updatePages();
};

Page.prototype.updateBkg = function () {
    var me = ScratchJr.stage.currentPage;
    ScratchJr.storyStart('Page.prototype.updateBkg');
    Undo.record({
        action: 'changebkg',
        where: me.id,
        who: me.id
    });
    Thumbs.updatePages();
};

Page.prototype.spriteAdded = function (spr) {
    var me = spr.div.parentNode.owner;
    me.setCurrentSprite(spr);
    me.update(spr);
    UI.spriteInView(spr);
    ScratchJr.onHold = false;
};

Page.prototype.pageAdded = function (spr) {
    var me = spr.div.parentNode.owner;
    Project.mediaCount--;
    me.setCurrentSprite(spr);
    ScratchJr.storyStart('Page.prototype.pageAdded');
    if (ScratchJr.stage.pages.length > 1) {
        Undo.record({
            action: 'addpage',
            where: me.id,
            who: me.id
        });
    }
    Thumbs.updateSprites();
    Thumbs.updatePages();
};

Page.prototype.addSprite = function (scale, md5, cname) {
    ScratchJr.onHold = true;
    var sprAttr = {
        flip: false,
        angle: 0,
        shown: true,
        type: 'sprite',
        scale: scale,
        defaultScale: scale,
        speed: 2,
        dirx: 1,
        diry: 1,
        sounds: ['pop.mp3'],
        homex: 240,
        homescale: scale,
        homey: 180,
        xcoor: 240,
        ycoor: 180,
        homeshown: true
    };
    sprAttr.page = ScratchJr.stage.currentPage;
    sprAttr.id = getIdFor(cname);
    sprAttr.name = cname;
    sprAttr.md5 = md5;
    new Sprite(sprAttr, this.spriteAdded);
};

Page.prototype.createSprite = function (data) {
    new Sprite(data, this.spriteAdded);
};

Page.prototype.modifySprite = function (md5, cid, sid) {
    var sprite = gn(unescape(sid)).owner;
    if (!sprite) {
        sprite = ScratchJr.getSprite();
    }
    sprite.md5 = md5;
    sprite.name = cid;
    var me = this;
    sprite.getAsset(gotImage);
    function gotImage (dataurl) {
        sprite.setCostume(dataurl, me.spriteAdded);
    }
};

Page.prototype.modifySpriteName = function (cid, sid) {
    var sprite = gn(unescape(sid)).owner;
    if (!sprite) {
        sprite = ScratchJr.getSprite();
    }
    sprite.name = cid;
    sprite.thumbnail.childNodes[1].textContent = cid;
    Undo.record({
        action: 'modify',
        where: this.id,
        who: sprite.id
    });
    ScratchJr.storyStart('Page.prototype.modifySpriteName');
};