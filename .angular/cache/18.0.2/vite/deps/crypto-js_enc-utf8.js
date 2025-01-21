import {
  require_core
} from "./chunk-MU7VTPFN.js";
import {
  __commonJS
} from "./chunk-PZQZAEDH.js";

// node_modules/crypto-js/enc-utf8.js
var require_enc_utf8 = __commonJS({
  "node_modules/crypto-js/enc-utf8.js"(exports, module) {
    (function(root, factory) {
      if (typeof exports === "object") {
        module.exports = exports = factory(require_core());
      } else if (typeof define === "function" && define.amd) {
        define(["./core"], factory);
      } else {
        factory(root.CryptoJS);
      }
    })(exports, function(CryptoJS) {
      return CryptoJS.enc.Utf8;
    });
  }
});
export default require_enc_utf8();
//# sourceMappingURL=crypto-js_enc-utf8.js.map
