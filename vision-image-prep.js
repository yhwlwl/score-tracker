/* Prepare readable score sheets without shrinking long screenshots into thumbnails. */
(function () {
  'use strict';
  var MAX_IMAGES = 12;
  var MAX_IMAGE_LENGTH = 3800000;
  var MAX_TOTAL_LENGTH = 18000000;
  var MAX_SOURCE_BYTES = 25 * 1024 * 1024;
  var MAX_SOURCE_PIXELS = 48000000;
  var MAX_SIDE = 3200;
  var MAX_PIXELS = 8000000;

  function failure(message, code) {
    var error = new Error(message);
    error.code = code;
    error.stage = 'image_preparation';
    return error;
  }
  function plan(width, height) {
    if (!(width > 0 && height > 0) || width * height > MAX_SOURCE_PIXELS) {
      throw failure('图片尺寸比较大，请先裁剪成绩区域再试。', 'image_dimensions_too_large');
    }
    var full = {x:0, y:0, width:width, height:height, kind:'original'};
    var horizontal = width > height, length = Math.max(width, height), short = Math.min(width, height);
    if (length <= MAX_SIDE || length / short < 2.4) return [full];
    var tile = Math.min(2400, Math.max(1200, short * 2));
    var overlap = Math.min(160, Math.round(tile * 0.1));
    var regions = [Object.assign({}, full, {kind:'overview'})];
    for (var start = 0; start < length; start += tile - overlap) {
      var size = Math.min(tile, length - start);
      regions.push(horizontal
        ? {x:start, y:0, width:size, height:height, kind:'segment'}
        : {x:0, y:start, width:width, height:size, kind:'segment'});
      if (regions.length > MAX_IMAGES) throw failure('图片内容比较长，请分段截图后再选，让小字保持清晰。', 'image_too_long');
      if (start + size >= length) break;
    }
    return regions;
  }
  function dataUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.onerror = reader.onabort = function () { reject(failure('读取图片失败，请重新选择图片。', 'image_read_failed')); };
      reader.readAsDataURL(file);
    });
  }
  function decode(source) {
    return new Promise(function (resolve, reject) {
      var image = new Image();
      image.onload = function () { resolve(image); };
      image.onerror = function () { reject(failure('这张图片暂时打不开，请换成 JPG、PNG 或截图再试。', 'image_decode_failed')); };
      image.src = source;
    });
  }
  function bytes(url) {
    var comma = url.indexOf(',');
    return Math.max(0, Math.floor((url.length - comma - 1) * 3 / 4) - (url.endsWith('==') ? 2 : url.endsWith('=') ? 1 : 0));
  }
  function encode(image, region, source) {
    var cap = region.kind === 'overview' ? 1600 : MAX_SIDE;
    var scale = Math.min(1, cap / Math.max(region.width, region.height), Math.sqrt(MAX_PIXELS / (region.width * region.height)));
    if (region.kind === 'original' && scale === 1 && source.length <= MAX_IMAGE_LENGTH && /^data:image\/(?:png|jpeg|jpg|webp);base64,/i.test(source)) {
      return {url:source, width:region.width, height:region.height, scale:1, quality:null, reencoded:false};
    }
    var canvas = document.createElement('canvas');
    try {
      var context = canvas.getContext('2d');
      if (!context) throw failure('图片暂时无法处理，请重新选择或换一张截图。', 'image_canvas_unavailable');
      for (var attempt = 0; attempt < 4; attempt += 1) {
        canvas.width = Math.max(1, Math.round(region.width * scale));
        canvas.height = Math.max(1, Math.round(region.height * scale));
        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(image, region.x, region.y, region.width, region.height, 0, 0, canvas.width, canvas.height);
        // Prefer lossless PNG for small text and table lines. Only use JPEG if necessary.
        var url = canvas.toDataURL('image/png'), quality = null;
        if (url.length > MAX_IMAGE_LENGTH) {
          quality = 0.94;
          url = canvas.toDataURL('image/jpeg', quality);
          if (url.length > MAX_IMAGE_LENGTH) { quality = 0.90; url = canvas.toDataURL('image/jpeg', quality); }
        }
        if (url.length <= MAX_IMAGE_LENGTH && /^data:image\/(?:png|jpeg);base64,/i.test(url)) {
          return {url:url, width:canvas.width, height:canvas.height, scale:scale, quality:quality, reencoded:true};
        }
        scale *= 0.85;
      }
      throw failure('图片内容较多，请裁剪成绩区域后再试，让文字更清晰。', 'image_encoded_too_large');
    } catch (error) {
      if (error && error.stage) throw error;
      throw failure('图片暂时无法处理，请换一张截图再试。', 'image_encode_failed');
    } finally {
      // Release the backing buffer before processing the next region on mobile devices.
      canvas.width = canvas.height = 1;
    }
  }
  async function prepare(files) {
    if (!files.length || files.length > 6) throw failure('请选择 1～6 张成绩单图片。', 'image_count_invalid');
    // Reject large sources before allocating base64 strings.
    if (files.some(function (f) { return f.size > MAX_SOURCE_BYTES; })) {
      throw failure('单张图片比较大，请裁剪成绩区域后再选。', 'image_source_too_large');
    }
    var images = [], parts = [], stats = [], total = 0;
    for (var i = 0; i < files.length; i += 1) {
      var source = await dataUrl(files[i]);
      var image = await decode(source);
      try {
        var width = image.naturalWidth || image.width, height = image.naturalHeight || image.height;
        var regions = plan(width, height);
        if (images.length + regions.length + files.length - i - 1 > MAX_IMAGES) {
          throw failure('这几张图片内容比较长，请分两次选择，让小字保持清晰。', 'image_parts_too_many');
        }
        for (var j = 0; j < regions.length; j += 1) {
          var region = regions[j], result = encode(image, region, source);
          total += result.url.length;
          if (total > MAX_TOTAL_LENGTH) throw failure('图片总大小比较大，请分两次选择后再识别。', 'image_total_too_large');
          images.push(result.url);
          parts.push({source_index:i, kind:region.kind, part_index:region.kind === 'segment' ? j : 0, part_count:regions.length > 1 ? regions.length - 1 : 1});
          stats.push({source_index:i, kind:region.kind, original_width:width, original_height:height, width:result.width, height:result.height, scale:Number(result.scale.toFixed(3)), original_bytes:files[i].size, encoded_bytes:bytes(result.url), format:result.url.slice(11, result.url.indexOf(';')), quality:result.quality, reencoded:result.reencoded});
        }
      } finally { image.src = ''; }
    }
    return {images:images, parts:parts, stats:stats, total_bytes:images.reduce(function (n, url) { return n + bytes(url); }, 0)};
  }
  window.__stVisionImages = {prepare:prepare, plan:plan};
})();
