function Color(type) {
  this.type = type;
  this.value = Array.prototype.slice.call(arguments, 1);
  
  var color = this;
  this.type.split('').forEach(function(key, i) {
    color.__defineGetter__(key, function()  { return color.value[i]; });
    color.__defineSetter__(key, function(v) { color.value[i] = v;    });
  });
  
  this.__defineGetter__('css', function() {
    // Assume we only support rgb(r,g,b)
    var c = color.as('rgb');
    return 'rgb(' + c.value.map(function(i) { return Math.round(i); }).join(',') + ')';
  });
}

Color.convert = {};

(function() {
  var hues = [
      0.0000,  19.3174,  27.5835,  34.1752,  40.1680,  46.1108,  52.5045,  59.9500,  71.4010,  87.9988,
    140.6367, 157.3704, 168.2442, 176.1214, 182.6762, 188.1224, 193.5751, 199.1268, 205.0883, 210.9866,
    216.9530, 224.2908, 262.9226, 277.9679, 289.4389, 304.2174, 318.2163, 329.3113, 338.3761, 346.9252,
    360.0000 // real:359.9973
  ];
  
  Color.convert.f2h = function(v) {
    var len = hues.length - 1; // We do not want the 360 at the end for this.
    var i = v[0] * len; while(i < 0) i += len;
    var j = Math.floor(i);
    var k = i - j;
    var a = j % len, b = (j+1) % len;
    return [ hues[a] * (1 - k) + (hues[b] + (b == 0 ? 360 : 0)) * k ];
  };
  
  Color.convert.h2f = function(v) {
    var h = v[0] % 360; if(h < 0) h += 360;
    for(var i = 0; i < hues.length-1; ++i) if(hues[i] <= h && h < hues[i+1]) {
      var x = (h - hues[i]) / (hues[i+1] - hues[i]);
      return [ (i + x) / 360 ];
    } return [ 0 ]; // Shold not happen, is hues broken?
  };
})();

Color.convert.rgb2rgb = function(v) { return v; };
Color.convert.rgb2lab = function(v) { return Color.convert.xyz2lab(Color.convert.rgb2xyz(v));};
Color.convert.rgb2xyz = function(v) {
  var v = [ v[0] / 255, v[1] / 255, v[2] / 255 ];
  for(var i = 0; i < 3; ++i)
    v[i] = (v[i] > 0.04045 ?
            Math.pow((v[i] + 0.055) / 1.055, 2.4) :
            v[i] / 12.92) * 100;
  return [
    v[0] * 0.4124564 + v[1] * 0.3575761 + v[2] * 0.1804375,
    v[0] * 0.2126729 + v[1] * 0.7151522 + v[2] * 0.0721750,
    v[0] * 0.0193339 + v[1] * 0.1191920 + v[2] * 0.9503041
  ];
};

Color.convert.xyz2lab = function(v) {
  var v = [ v[0] / 95.047, v[1] / 100.000, v[2] / 108.883 ];
  for(var i = 0; i < 3; ++i)
    v[i] = v[i] > 0.008856 ? Math.pow(v[i], 1/3) : v[i] * 7.787 + 16 / 116;
  return [
    116 * v[1] - 16,
    500 * (v[0] - v[1]),
    200 * (v[1] - v[2])
  ];
};

Color.convert.hsl2rgb = function(v) {
  function hue2rgb(v1, v2, vH) {
    if(vH < 0) vH += 1;
    else if(vH > 1) vH -= 1;

    if((6 * vH) < 1) return v1 + (v2 - v1) * 6 * vH;
    if((2 * vH) < 1) return v2;
    if((3 * vH) < 2) return v1 + (v2 - v1) * (2 / 3 - vH) * 6;

    return v1;
  }
  
  var h = v[0] / 360, s = v[1], l = v[2];
  if(s == 0) return [ l * 255, l * 255, l * 255 ];
  var var_2 = l < 0.5 ? l * (1 + s) : (l + s) - (s * l);
  var var_1 = 2 * l - var_2;
  return [
    255 * hue2rgb(var_1, var_2, h + (1 / 3)),
    255 * hue2rgb(var_1, var_2, h          ),
    255 * hue2rgb(var_1, var_2, h - (1 / 3))
  ];
};

Color.convert.hsl2fsl = function(v) {
  v[0] = Color.convert.h2f(v)[0];
  return v;
};

Color.convert.fsl2hsl = function(v) {
  v[0] = Color.convert.f2h(v)[0]; // Convert v to hsl
  return v;
};

Color.convert.fsl2rgb = function(v) { return Color.convert.hsl2rgb(Color.convert.fsl2hsl(v)); };

Color.from = function(type) {
  var color = new Color(type);
  color.value = Array.prototype.slice.call(arguments, 1);
  return color;
};

Color.fromArray = function(type, value) {
  var color = new Color(type);
  color.value = value;
  return color;
};

Color.prototype.as = function(newType) {
  function can(a, b) { return Color.convert.hasOwnProperty(a + '2' + b); }
  
  if(can(this.type, newType)) // direct conversion
    return Color.fromArray(newType, Color.convert[this.type + '2' + newType](this.value));
  
  // Try converting to rgb first?
  if(!can(this.type, 'rgb') || !can('rgb', newType)) return null;
  
  var conv = this.value;
  conv = Color.convert[this.type + '2rgb'](conv);
  conv = Color.convert['rgb2' + newType](conv);
  return Color.fromArray(new Type, conv);
};

//
// Color difference.
// We don't need this, but I put so much effort into implementing CIEDE2000!
//

Color.cie76 = function(a, b) {
  if(!(a instanceof Array)) a = a.as('lab').value;
  if(!(b instanceof Array)) b = b.as('lab').value;
  
  var dL = a[0] - b[0], dA = a[1] - b[1], dB = a[2] - b[2];
  return Math.sqrt(dL * dL + dA * dA + dB * dB);
};

// Euclidean distance in L*a*b* colorspace? We can do better than that!
Color.cie94 = function(a, b) {
  function ab2c(a, b) { return Math.sqrt(a * a + b * b); }
  
  if(!(a instanceof Array)) a = a.as('lab').value;
  if(!(b instanceof Array)) b = b.as('lab').value;
  
  var kL = 1, K1 = 0.045, K2 = 0.015; // Graphics.
  var kC = 1, kH = 1; // Unity.
  
  var L1 = a[0], L2 = b[0];
  var dL = L1 - L2;
  var C1 = ab2c(a[1], a[2]), C2 = ab2c(b[1], b[2]);
  var dC = C1 - C2;
  var da = a[1] - b[1], db = a[2] - b[2];
  var dH = Math.sqrt(da * da + db * db - dC * dC);
  var SL = 1, SC = 1 + K1 * C1, SH = 1 + K2 * C1;
  
  var sum1 = dL / (kL * SL),
      sum2 = dC / (kC * SC),
      sum3 = dH / (kH * SH);
  console.log(sum1 + '+' + sum2 + '+' + sum3);
  return Math.sqrt(sum1 * sum1 + sum2 * sum2 + sum3 * sum3);
};

// Because CIE94 is by far not complex enough!
Color.cie2000 = function(a, b) {
  function ab2c(a, b) { return Math.sqrt(a * a + b * b); }
  
  if(!(a instanceof Array)) a = a.as('lab').value;
  if(!(b instanceof Array)) b = b.as('lab').value;
  
  var kL = 1, K1 = 0.045, K2 = 0.015; // Graphics.
  var kC = 1, kH = 1; // Unity.
  
  // Let's have some fun!
  
  var L1 = a[0], L2 = b[0];
  var dL_ = L2 - L1;
  var Lavg = (L1 + L2) / 2;
  
  var C1 = ab2c(a[1], a[2]), C2 = ab2c(b[1], b[2]);
  var Cavg = (C1 + C2) / 2;
  
  var tmp1 = 1 - Math.sqrt(Math.pow(Cavg, 7) / (Math.pow(Cavg, 7) + Math.pow(25, 7)));
  var a1 = a[1], b1 = a[2];
  var a2 = b[1], b2 = b[2];
  var a1_ = a1 + a1 / 2 * tmp1,
      a2_ = a2 + a2 / 2 * tmp1;
  
  var C1_ = ab2c(a1_, b1),
      C2_ = ab2c(a2_, b2);
  var dC_ = C2_ - C1_,
      C_avg = (C1_ + C2_) / 2;
  
  var h1_ = Math.atan2(b1, a1_); if(h1_ < 0) h1_ += Math.PI * 2;
  var h2_ = Math.atan2(b2, a2_); if(h2_ < 0) h2_ += Math.PI * 2;
  var dh_ = h2_ - h1_; if(Math.abs(dh_) > Math.PI) dh_ += Math.PI * (h2_ <= h1_ ? 2 : -2);
  
  var dH_ = 2 * Math.sqrt(C1_ * C2_) * Math.sin(dh_ / 2),
      H_avg = (h1_ + h2_ + Math.PI * (Math.abs(h1_ - h2_) > Math.PI ? 2 : 0)) / 2;
  
  var T = 1 - 0.17 * Math.cos(H_avg - Math.PI / 6) + 0.24 * Math.cos(2 * H_avg) +
      0.32 * Math.cos(3 * H_avg + Math.PI / 30) - 0.20 * Math.cos(4 * H_avg - Math.PI / 180 * 63);
  
  var tmp2 = Math.pow(Lavg - 50, 2);
  var SL = 1 + 0.015 * tmp2 / Math.sqrt(20 + tmp2);
  var SC = 1 + 0.045 * C_avg;
  var SH = 1 + 0.015 * C_avg * T;
  
  var deg275 = Math.PI / 180 * 275, deg25 = Math.PI / 180 * 25;
  var tmp3 = Math.pow(Math.E, -Math.pow((H_avg - deg275) / deg25, 2));
  var tmp4 = Math.sqrt(Math.pow(C_avg, 7) / (Math.pow(C_avg, 7) + Math.pow(25, 7)));
  var RT = -2 * tmp4 * Math.sin(Math.PI / 3 * tmp3);
  
  var sumL = dL_ / (kL * SL);
  var sumC = dC_ / (kC * SC);
  var sumH = dH_ / (kH * SH);
  var other = RT * sumC * sumH;
  
  return Math.sqrt(sumL * sumL + sumC * sumC + sumH * sumH + other);
};