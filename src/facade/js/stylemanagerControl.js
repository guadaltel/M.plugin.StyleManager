import namespace from 'util/decorator';
import StyleManagerImplControl from 'impl/stylemanagerControl';
import BindingController from './bindingcontroller';

@namespace("M.control")
export class StyleManagerControl extends M.Control {

  /**
   * @classdesc
   * Main constructor of the class. Creates a PluginControl
   * control
   *
   * @constructor
   * @extends {M.Control}
   * @api stable
   */
  constructor(layer) {
    // 1. checks if the implementation can create PluginControl
    if (M.utils.isUndefined(M.impl.control.StyleManagerControl)) {
      M.exception('La implementación usada no puede crear controles PluginControl');
    }

    // 2. implementation of this control
    let impl = new M.impl.control.StyleManagerControl();
    super(impl, "StyleManager");
    this.layer_ = layer;
  }
  /**
   * This function creates the view
   *
   * @public
   * @function
   * @param {M.Map} map to add the control
   * @api stable
   */
  createView(map) {
    this.facadeMap_ = map;
    let layers = map.getWFS().concat(map.getKML().concat(map.getLayers().filter(layer => layer.type === "GeoJSON")));
    return new Promise((success, fail) => {
      M.template.compile('stylemanager.html', {
        'jsonp': true,
        vars: {
          layers: layers
        }
      }).then((html) => {
        let htmlSelect = html.querySelector('#m-stylemanager-select');
        let container = html.querySelector('.m-stylemanager-container-select');
        this.bindinController_ = new M.plugin.stylemanager.BindingController(container);
        this.addSelectListener(htmlSelect, html);
        this.subscribeAddedLayer(htmlSelect);
        this.addApplyBtnListener(html);
        this.addClearBtnListener(html);
        this.renderOptionsLayerParam(htmlSelect, html, layers);

        success(html);
      });
    });
  }

  /**
   * @public
   * @function
   * @param {HTMLElement} html to add the plugin
   * @api stable
   */
  renderOptionsLayerParam(htmlSelect, html, layers) {
    if (this.layer_ instanceof M.layer.Vector) {
      Promise.all(this.bindinController_.getAllCompilePromises()).then(() => {
        this.renderOptions(htmlSelect, html, this.layer_);
        M.template.compile("selectlayer.html", {
          vars: {
            layers: layers.map(layer => {
              return {
                name: layer.name,
                selected: this.layer_.name
              };
            }),
          }
        }).then(html => {
          htmlSelect.innerHTML = html.innerHTML;
        });
      });
    }
  }

  /**
   * @public
   * @function
   * @param {HTMLElement} html to add the plugin
   * @api stable
   */
  addOpenAttribute(html) {
    let containerSelect = html.querySelector(".m-stylemanager-container-select");
    containerSelect.setAttribute("open-select", "");
  }

  /**
   * @public
   * @function
   * @param {HTMLElement} html to add the plugin
   * @api stable
   */
  addApplyBtnListener(html) {
    let buttonApply = html.querySelector("[data-apply-style]");
    buttonApply.addEventListener('click', this.applyStyle.bind(this));
  }

  /**
   * @public
   * @function
   * @param {HTMLElement} html to add the plugin
   * @api stable
   */
  addClearBtnListener(html) {
    let buttonClear = html.querySelector("[data-clear-style]");
    buttonClear.addEventListener('click', this.clearStyle.bind(this));
  }

  /**
   * @public
   * @function
   * @param {HTMLElement} html to add the plugin
   * @api stable
   */
  addSelectListener(htmlSelect, html) {
    htmlSelect.addEventListener('change', () => {
      this.renderOptions(htmlSelect, html);
    });
  }

  /**
   * @public
   * @function
   * @param {HTMLElement} html to add the plugin
   * @api stable
   */
  subscribeAddedLayer(htmlSelect) {
    this.facadeMap_.on(M.evt.ADDED_LAYER, (layers) => {

      layers.filter(layer => layer instanceof M.layer.Vector).forEach(layer => this.addLayerOption(htmlSelect, layer.name));
    });
  }

  /**
   * @public
   * @function
   * @param {HTMLElement} html to add the plugin
   * @api stable
   */
  getActivationButton(html) {
    return html.querySelector('button.m-panel-btn');
  }

  /**
   * @function
   */
  addLayerOption(htmlSelect, name) {
    if (name != "cluster_cover") {
      if (this.isNotAdded(name) === true) {
        let htmlOption = document.createElement("option");
        htmlOption.setAttribute("name", name);
        htmlOption.innerText = name;
        htmlSelect.add(htmlOption);
      }
    }
  }

  /**
   * @function
   */
  isNotAdded(layerName) {
    let layers = this.facadeMap_.getLayers().filter(layer => layer instanceof M.layer.Vector);
    return layers.find(layer => layer.name === layerName) == null;
  }

  /**
   * @public
   * @function
   * @param {HTMLElement} html to add the plugin
   * @api stable
   */
  renderOptions(htmlSelect, html, layer = null) {
    let layerName = htmlSelect.value;
    this.layer_ = this.getLayerByName(layerName);
    if (layer != null) {
      this.layer_ = layer;
    }
    if (this.layer_ instanceof M.layer.Vector) {
      let features = this.layer_.getFeatures();
      if (features.length === 0) {
        M.dialog.error('La capa no tiene features o aún no se han cargado.', 'Error');
        htmlSelect.selectedIndex = 0;
      }
      else {
        this.bindinController_.change(this.layer_);
        this.showBoxes(html);
        this.addOpenAttribute(html);
      }
    }
  }

  /**
   * @public
   * @function
   * @param {HTMLElement} html to add the plugin
   * @api stable
   */
  getLayerByName(layerName) {
    let layers = this.facadeMap_.getWFS()
      .concat(this.facadeMap_.getKML().concat(this.facadeMap_.getLayers().filter(layer => layer.type === "GeoJSON")));
    return layers.find(layer => layer.name === layerName);
  }

  /**
   * @public
   * @function
   * @param {HTMLElement} html to add the plugin
   * @api stable
   */
  showBoxes(htmlParent) {
    htmlParent.querySelector(".m-boxes").classList.remove("m-hidden");
  }

  /**
   * @public
   * @function
   * @param {HTMLElement} html to add the plugin
   * @api stable
   */
  applyStyle() {
    if (this.layer_ instanceof M.layer.Vector) {
      this.layer_.clearStyle();
      let style = this.bindinController_.getStyle();
      this.layer_.setStyle(style);
    }
    else {
      M.dialog.info("Tiene que elegir una capa.", "Elija capa");
    }
  }

  /**
   * @public
   * @function
   * @param {HTMLElement} html to add the plugin
   * @api stable
   */
  clearStyle() {
    if (this.layer_ instanceof M.layer.Vector) {
      this.layer_.clearStyle();
    }
    else {
      M.dialog.info("Tiene que elegir una capa.", "Elija capa");
    }
  }
}
