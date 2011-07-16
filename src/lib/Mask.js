/**
 * @requires javelin-install javelin-vector javelin-dom
 * @provides javelin-mask
 * @javelin
 */

/**
 * Show a transparent "mask" over the page; used by Workflow to draw visual
 * attention to modal dialogs.
 *
 * @group control
 */
JX.install('Mask', {
  statics : {
    _depth : 0,
    _mask : null,
    show : function() {
      if (!JX.Mask._depth) {
        JX.Mask._mask = JX.$N('div', {className: 'jx-mask'});
        document.body.appendChild(JX.Mask._mask);
        JX.Vector.getDocument().setDim(JX.Mask._mask);
      }
      ++JX.Mask._depth;
    },
    hide : function() {
      --JX.Mask._depth;
      if (!JX.Mask._depth) {
        JX.DOM.remove(JX.Mask._mask);
        JX.Mask._mask = null;
      }
    }
  }
});
