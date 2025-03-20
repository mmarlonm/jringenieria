import {
  MatTooltip,
  MatTooltipModule
} from "./chunk-PUDYATEA.js";
import {
  MatProgressSpinner,
  MatProgressSpinnerModule
} from "./chunk-Q3Y7GXJN.js";
import {
  MatSelect
} from "./chunk-332W2R26.js";
import {
  MatCheckbox,
  MatCheckboxModule
} from "./chunk-B6VOE5DT.js";
import {
  MatDivider,
  MatDividerModule
} from "./chunk-NYYBW6NV.js";
import {
  MatIcon,
  MatIconModule
} from "./chunk-FQIJQFQG.js";
import "./chunk-C5VH5WQB.js";
import {
  MatButtonModule,
  MatIconButton
} from "./chunk-Q4J7EMWL.js";
import "./chunk-HI34JMUY.js";
import {
  ViewportRuler
} from "./chunk-NOXDNXBX.js";
import "./chunk-7CF7LRKJ.js";
import {
  MatFormField
} from "./chunk-YK7BWRIJ.js";
import "./chunk-J6SBK7CG.js";
import {
  MatOption
} from "./chunk-OOMSV5SI.js";
import "./chunk-2POETUSR.js";
import "./chunk-H3ZOURSG.js";
import "./chunk-DTY7YS6A.js";
import "./chunk-EBGSCAIA.js";
import "./chunk-QVQXTKBB.js";
import "./chunk-ACTQ6ONP.js";
import "./chunk-W6FPCJ3P.js";
import {
  DefaultValueAccessor,
  FormControl,
  FormControlDirective,
  NG_VALUE_ACCESSOR,
  NgControlStatus,
  ReactiveFormsModule
} from "./chunk-YN2TACXQ.js";
import {
  AsyncPipe,
  CommonModule,
  NgClass,
  NgIf
} from "./chunk-6MO46Y6V.js";
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  Directive,
  ElementRef,
  EventEmitter,
  Inject,
  InjectionToken,
  Input,
  NgModule,
  Optional,
  Output,
  ViewChild,
  forwardRef,
  setClassMetadata,
  ɵɵProvidersFeature,
  ɵɵadvance,
  ɵɵattribute,
  ɵɵcontentQuery,
  ɵɵdefineComponent,
  ɵɵdefineDirective,
  ɵɵdefineInjector,
  ɵɵdefineNgModule,
  ɵɵdirectiveInject,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵloadQuery,
  ɵɵnextContext,
  ɵɵpipe,
  ɵɵpipeBind1,
  ɵɵprojection,
  ɵɵprojectionDef,
  ɵɵproperty,
  ɵɵpureFunction2,
  ɵɵqueryRefresh,
  ɵɵreference,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵtemplate,
  ɵɵtemplateRefExtractor,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵviewQuery
} from "./chunk-FCS4ANO4.js";
import "./chunk-SAVXX6OM.js";
import "./chunk-SG3BCSKH.js";
import {
  BehaviorSubject,
  Subject,
  combineLatest,
  delay,
  filter,
  map,
  of,
  startWith,
  switchMap,
  take,
  takeUntil,
  tap
} from "./chunk-PQ7O3X3G.js";
import "./chunk-X6JV76XL.js";

// node_modules/ngx-mat-select-search/fesm2022/ngx-mat-select-search.mjs
var _c0 = ["searchSelectInput"];
var _c1 = ["innerSelectSearch"];
var _c2 = [[["", 8, "mat-select-search-custom-header-content"]], [["", "ngxMatSelectSearchClear", ""]], [["", "ngxMatSelectNoEntriesFound", ""]]];
var _c3 = [".mat-select-search-custom-header-content", "[ngxMatSelectSearchClear]", "[ngxMatSelectNoEntriesFound]"];
var _c4 = (a0, a1) => ({
  "mat-select-search-inner-multiple": a0,
  "mat-select-search-inner-toggle-all": a1
});
function MatSelectSearchComponent_mat_checkbox_4_Template(rf, ctx) {
  if (rf & 1) {
    const _r2 = ɵɵgetCurrentView();
    ɵɵelementStart(0, "mat-checkbox", 12);
    ɵɵlistener("change", function MatSelectSearchComponent_mat_checkbox_4_Template_mat_checkbox_change_0_listener($event) {
      ɵɵrestoreView(_r2);
      const ctx_r2 = ɵɵnextContext();
      return ɵɵresetView(ctx_r2._emitSelectAllBooleanToParent($event.checked));
    });
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = ɵɵnextContext();
    ɵɵproperty("color", ctx_r2.matFormField == null ? null : ctx_r2.matFormField.color)("checked", ctx_r2.toggleAllCheckboxChecked)("indeterminate", ctx_r2.toggleAllCheckboxIndeterminate)("matTooltip", ctx_r2.toggleAllCheckboxTooltipMessage)("matTooltipPosition", ctx_r2.toggleAllCheckboxTooltipPosition);
  }
}
function MatSelectSearchComponent_mat_spinner_7_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelement(0, "mat-spinner", 13);
  }
}
function MatSelectSearchComponent_button_8_ng_content_1_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵprojection(0, 1, ["*ngIf", "clearIcon; else defaultIcon"]);
  }
}
function MatSelectSearchComponent_button_8_ng_template_2_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementStart(0, "mat-icon", 16);
    ɵɵtext(1);
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = ɵɵnextContext(2);
    ɵɵproperty("svgIcon", ctx_r2.closeSvgIcon);
    ɵɵadvance();
    ɵɵtextInterpolate1(" ", !ctx_r2.closeSvgIcon ? ctx_r2.closeIcon : null, " ");
  }
}
function MatSelectSearchComponent_button_8_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = ɵɵgetCurrentView();
    ɵɵelementStart(0, "button", 14);
    ɵɵlistener("click", function MatSelectSearchComponent_button_8_Template_button_click_0_listener() {
      ɵɵrestoreView(_r4);
      const ctx_r2 = ɵɵnextContext();
      return ɵɵresetView(ctx_r2._reset(true));
    });
    ɵɵtemplate(1, MatSelectSearchComponent_button_8_ng_content_1_Template, 1, 0, "ng-content", 15)(2, MatSelectSearchComponent_button_8_ng_template_2_Template, 2, 2, "ng-template", null, 2, ɵɵtemplateRefExtractor);
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const defaultIcon_r5 = ɵɵreference(3);
    const ctx_r2 = ɵɵnextContext();
    ɵɵadvance();
    ɵɵproperty("ngIf", ctx_r2.clearIcon)("ngIfElse", defaultIcon_r5);
  }
}
function MatSelectSearchComponent_div_11_ng_content_1_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵprojection(0, 2, ["*ngIf", "noEntriesFound; else defaultNoEntriesFound"]);
  }
}
function MatSelectSearchComponent_div_11_ng_template_2_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵtext(0);
  }
  if (rf & 2) {
    const ctx_r2 = ɵɵnextContext(2);
    ɵɵtextInterpolate(ctx_r2.noEntriesFoundLabel);
  }
}
function MatSelectSearchComponent_div_11_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementStart(0, "div", 17);
    ɵɵtemplate(1, MatSelectSearchComponent_div_11_ng_content_1_Template, 1, 0, "ng-content", 15)(2, MatSelectSearchComponent_div_11_ng_template_2_Template, 1, 1, "ng-template", null, 3, ɵɵtemplateRefExtractor);
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const defaultNoEntriesFound_r6 = ɵɵreference(3);
    const ctx_r2 = ɵɵnextContext();
    ɵɵadvance();
    ɵɵproperty("ngIf", ctx_r2.noEntriesFound)("ngIfElse", defaultNoEntriesFound_r6);
  }
}
var MatSelectSearchClearDirective = class _MatSelectSearchClearDirective {
  static ɵfac = function MatSelectSearchClearDirective_Factory(t) {
    return new (t || _MatSelectSearchClearDirective)();
  };
  static ɵdir = ɵɵdefineDirective({
    type: _MatSelectSearchClearDirective,
    selectors: [["", "ngxMatSelectSearchClear", ""]]
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(MatSelectSearchClearDirective, [{
    type: Directive,
    args: [{
      selector: "[ngxMatSelectSearchClear]",
      standalone: false
    }]
  }], null, null);
})();
var configurableDefaultOptions = ["ariaLabel", "clearSearchInput", "closeIcon", "closeSvgIcon", "disableInitialFocus", "disableScrollToActiveOnOptionsChanged", "enableClearOnEscapePressed", "hideClearSearchButton", "noEntriesFoundLabel", "placeholderLabel", "preventHomeEndKeyPropagation", "searching"];
var MAT_SELECTSEARCH_DEFAULT_OPTIONS = new InjectionToken("mat-selectsearch-default-options");
var MatSelectNoEntriesFoundDirective = class _MatSelectNoEntriesFoundDirective {
  static ɵfac = function MatSelectNoEntriesFoundDirective_Factory(t) {
    return new (t || _MatSelectNoEntriesFoundDirective)();
  };
  static ɵdir = ɵɵdefineDirective({
    type: _MatSelectNoEntriesFoundDirective,
    selectors: [["", "ngxMatSelectNoEntriesFound", ""]]
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(MatSelectNoEntriesFoundDirective, [{
    type: Directive,
    args: [{
      selector: "[ngxMatSelectNoEntriesFound]",
      standalone: false
    }]
  }], null, null);
})();
var MatSelectSearchComponent = class _MatSelectSearchComponent {
  matSelect;
  changeDetectorRef;
  _viewportRuler;
  matOption;
  matFormField;
  /** Label of the search placeholder */
  placeholderLabel = "Suche";
  /** Type of the search input field */
  type = "text";
  /** Font-based icon used for displaying Close-Icon */
  closeIcon = "close";
  /** SVG-based icon used for displaying Close-Icon. If set, closeIcon is overridden */
  closeSvgIcon;
  /** Label to be shown when no entries are found. Set to null if no message should be shown. */
  noEntriesFoundLabel = "Keine Optionen gefunden";
  /**
    * Whether the search field should be cleared after the dropdown menu is closed.
    * Useful for server-side filtering. See [#3](https://github.com/bithost-gmbh/ngx-mat-select-search/issues/3)
    */
  clearSearchInput = true;
  /** Whether to show the search-in-progress indicator */
  searching = false;
  /** Disables initial focusing of the input field */
  disableInitialFocus = false;
  /** Enable clear input on escape pressed */
  enableClearOnEscapePressed = false;
  /**
   * Prevents home / end key being propagated to mat-select,
   * allowing to move the cursor within the search input instead of navigating the options
   */
  preventHomeEndKeyPropagation = false;
  /** Disables scrolling to active options when option list changes. Useful for server-side search */
  disableScrollToActiveOnOptionsChanged = false;
  /** Adds 508 screen reader support for search box */
  ariaLabel = "dropdown search";
  /** Whether to show Select All Checkbox (for mat-select[multi=true]) */
  showToggleAllCheckbox = false;
  /** Select all checkbox checked state */
  toggleAllCheckboxChecked = false;
  /** select all checkbox indeterminate state */
  toggleAllCheckboxIndeterminate = false;
  /** Display a message in a tooltip on the toggle-all checkbox */
  toggleAllCheckboxTooltipMessage = "";
  /** Define the position of the tooltip on the toggle-all checkbox. */
  toggleAllCheckboxTooltipPosition = "below";
  /** Show/Hide the search clear button of the search input */
  hideClearSearchButton = false;
  /**
   * Always restore selected options on selectionChange for mode multi (e.g. for lazy loading/infinity scrolling).
   * Defaults to false, so selected options are only restored while filtering is active.
   */
  alwaysRestoreSelectedOptionsMulti = false;
  /**
   * Recreate array of selected values for multi-selects.
   *
   * This is useful if the selected values are stored in an immutable data structure.
   */
  recreateValuesArray = false;
  /** Output emitter to send to parent component with the toggle all boolean */
  toggleAll = new EventEmitter();
  /** Reference to the search input field */
  searchSelectInput;
  /** Reference to the search input field */
  innerSelectSearch;
  /** Reference to custom search input clear icon */
  clearIcon;
  /** Reference to custom no entries found element */
  noEntriesFound;
  /** Current search value */
  get value() {
    return this._formControl.value;
  }
  _lastExternalInputValue;
  onTouched = (_) => {
  };
  /** Reference to the MatSelect options */
  set _options(_options) {
    this._options$.next(_options);
  }
  get _options() {
    return this._options$.getValue();
  }
  _options$ = new BehaviorSubject(null);
  optionsList$ = this._options$.pipe(switchMap((_options) => _options ? _options.changes.pipe(map((options) => options.toArray()), startWith(_options.toArray())) : of(null)));
  optionsLength$ = this.optionsList$.pipe(map((options) => options ? options.length : 0));
  /** Previously selected values when using <mat-select [multiple]="true">*/
  previousSelectedValues;
  _formControl = new FormControl("", {
    nonNullable: true
  });
  /** Whether to show the no entries found message */
  _showNoEntriesFound$ = combineLatest([this._formControl.valueChanges, this.optionsLength$]).pipe(map(([value, optionsLength]) => !!(this.noEntriesFoundLabel && value && optionsLength === this.getOptionsLengthOffset())));
  /** Subject that emits when the component has been destroyed. */
  _onDestroy = new Subject();
  /** Reference to active descendant for ARIA Support. */
  activeDescendant;
  constructor(matSelect, changeDetectorRef, _viewportRuler, matOption, matFormField, defaultOptions) {
    this.matSelect = matSelect;
    this.changeDetectorRef = changeDetectorRef;
    this._viewportRuler = _viewportRuler;
    this.matOption = matOption;
    this.matFormField = matFormField;
    this.applyDefaultOptions(defaultOptions);
  }
  applyDefaultOptions(defaultOptions) {
    if (!defaultOptions) {
      return;
    }
    for (const key of configurableDefaultOptions) {
      if (defaultOptions.hasOwnProperty(key)) {
        this[key] = defaultOptions[key];
      }
    }
  }
  ngOnInit() {
    if (this.matOption) {
      this.matOption.disabled = true;
      this.matOption._getHostElement().classList.add("contains-mat-select-search");
      this.matOption._getHostElement().setAttribute("role", "presentation");
    } else {
      console.error("<ngx-mat-select-search> must be placed inside a <mat-option> element");
    }
    this.matSelect.openedChange.pipe(delay(1), takeUntil(this._onDestroy)).subscribe((opened) => {
      if (opened) {
        this.updateInputWidth();
        if (!this.disableInitialFocus) {
          this._focus();
        }
      } else {
        if (this.clearSearchInput) {
          this._reset();
        }
      }
    });
    this.matSelect.openedChange.pipe(take(1), switchMap((_) => {
      this._options = this.matSelect.options;
      let previousFirstOption = this._options.toArray()[this.getOptionsLengthOffset()];
      return this._options.changes.pipe(tap(() => {
        setTimeout(() => {
          const options = this._options.toArray();
          const currentFirstOption = options[this.getOptionsLengthOffset()];
          const keyManager = this.matSelect._keyManager;
          if (keyManager && this.matSelect.panelOpen && currentFirstOption) {
            const firstOptionIsChanged = !previousFirstOption || !this.matSelect.compareWith(previousFirstOption.value, currentFirstOption.value);
            if (firstOptionIsChanged || !keyManager.activeItem || !options.find((option) => this.matSelect.compareWith(option.value, keyManager.activeItem?.value))) {
              keyManager.setActiveItem(this.getOptionsLengthOffset());
            }
            setTimeout(() => {
              this.updateInputWidth();
            });
          }
          previousFirstOption = currentFirstOption;
        });
      }));
    })).pipe(takeUntil(this._onDestroy)).subscribe();
    this._showNoEntriesFound$.pipe(takeUntil(this._onDestroy)).subscribe((showNoEntriesFound) => {
      if (this.matOption) {
        if (showNoEntriesFound) {
          this.matOption._getHostElement().classList.add("mat-select-search-no-entries-found");
        } else {
          this.matOption._getHostElement().classList.remove("mat-select-search-no-entries-found");
        }
      }
    });
    this._viewportRuler.change().pipe(takeUntil(this._onDestroy)).subscribe(() => {
      if (this.matSelect.panelOpen) {
        this.updateInputWidth();
      }
    });
    this.initMultipleHandling();
    this.optionsList$.pipe(takeUntil(this._onDestroy)).subscribe(() => {
      this.changeDetectorRef.markForCheck();
    });
  }
  _emitSelectAllBooleanToParent(state) {
    this.toggleAll.emit(state);
  }
  ngOnDestroy() {
    this._onDestroy.next();
    this._onDestroy.complete();
  }
  _isToggleAllCheckboxVisible() {
    return this.matSelect.multiple && this.showToggleAllCheckbox;
  }
  /**
   * Handles the key down event with MatSelect.
   * Allows e.g. selecting with enter key, navigation with arrow keys, etc.
   * @param event
   */
  _handleKeydown(event) {
    if (event.key && event.key.length === 1 || this.preventHomeEndKeyPropagation && (event.key === "Home" || event.key === "End")) {
      event.stopPropagation();
    }
    if (this.matSelect.multiple && event.key && event.key === "Enter") {
      setTimeout(() => this._focus());
    }
    if (this.enableClearOnEscapePressed && event.key === "Escape" && this.value) {
      this._reset(true);
      event.stopPropagation();
    }
  }
  /**
   * Handles the key up event with MatSelect.
   * Allows e.g. the announcing of the currently activeDescendant by screen readers.
   */
  _handleKeyup(event) {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      const ariaActiveDescendantId = this.matSelect._getAriaActiveDescendant();
      const index = this._options.toArray().findIndex((item) => item.id === ariaActiveDescendantId);
      if (index !== -1) {
        this.unselectActiveDescendant();
        this.activeDescendant = this._options.toArray()[index]._getHostElement();
        this.activeDescendant.setAttribute("aria-selected", "true");
        this.searchSelectInput.nativeElement.setAttribute("aria-activedescendant", ariaActiveDescendantId);
      }
    }
  }
  writeValue(value) {
    this._lastExternalInputValue = value;
    this._formControl.setValue(value);
    this.changeDetectorRef.markForCheck();
  }
  onBlur() {
    this.unselectActiveDescendant();
    this.onTouched();
  }
  registerOnChange(fn) {
    this._formControl.valueChanges.pipe(filter((value) => value !== this._lastExternalInputValue), tap(() => this._lastExternalInputValue = void 0), takeUntil(this._onDestroy)).subscribe(fn);
  }
  registerOnTouched(fn) {
    this.onTouched = fn;
  }
  /**
   * Focuses the search input field
   */
  _focus() {
    if (!this.searchSelectInput || !this.matSelect.panel) {
      return;
    }
    const panel = this.matSelect.panel.nativeElement;
    const scrollTop = panel.scrollTop;
    this.searchSelectInput.nativeElement.focus();
    panel.scrollTop = scrollTop;
  }
  /**
   * Resets the current search value
   * @param focus whether to focus after resetting
   */
  _reset(focus) {
    this._formControl.setValue("");
    if (focus) {
      this._focus();
    }
  }
  /**
   * Initializes handling <mat-select [multiple]="true">
   * Note: to improve this code, mat-select should be extended to allow disabling resetting the selection while filtering.
   */
  initMultipleHandling() {
    if (!this.matSelect.ngControl) {
      if (this.matSelect.multiple) {
        console.error("the mat-select containing ngx-mat-select-search must have a ngModel or formControl directive when multiple=true");
      }
      return;
    }
    this.previousSelectedValues = this.matSelect.ngControl.value;
    if (!this.matSelect.ngControl.valueChanges) {
      return;
    }
    this.matSelect.ngControl.valueChanges.pipe(takeUntil(this._onDestroy)).subscribe((values) => {
      let restoreSelectedValues = false;
      if (this.matSelect.multiple) {
        if ((this.alwaysRestoreSelectedOptionsMulti || this._formControl.value && this._formControl.value.length) && this.previousSelectedValues && Array.isArray(this.previousSelectedValues)) {
          if (!values || !Array.isArray(values)) {
            values = [];
          }
          const optionValues = this.matSelect.options.map((option) => option.value);
          this.previousSelectedValues.forEach((previousValue) => {
            if (!values.some((v) => this.matSelect.compareWith(v, previousValue)) && !optionValues.some((v) => this.matSelect.compareWith(v, previousValue))) {
              if (this.recreateValuesArray) {
                values = [...values, previousValue];
              } else {
                values.push(previousValue);
              }
              restoreSelectedValues = true;
            }
          });
        }
      }
      this.previousSelectedValues = values;
      if (restoreSelectedValues) {
        this.matSelect._onChange(values);
      }
    });
  }
  /**
   *  Set the width of the innerSelectSearch to fit even custom scrollbars
   *  And support all Operating Systems
   */
  updateInputWidth() {
    if (!this.innerSelectSearch || !this.innerSelectSearch.nativeElement) {
      return;
    }
    let element = this.innerSelectSearch.nativeElement;
    let panelElement = null;
    while (element && element.parentElement) {
      element = element.parentElement;
      if (element.classList.contains("mat-select-panel")) {
        panelElement = element;
        break;
      }
    }
    if (panelElement) {
      this.innerSelectSearch.nativeElement.style.width = panelElement.clientWidth + "px";
    }
  }
  /**
   * Determine the offset to length that can be caused by the optional matOption used as a search input.
   */
  getOptionsLengthOffset() {
    if (this.matOption) {
      return 1;
    } else {
      return 0;
    }
  }
  unselectActiveDescendant() {
    this.activeDescendant?.removeAttribute("aria-selected");
    this.searchSelectInput.nativeElement.removeAttribute("aria-activedescendant");
  }
  static ɵfac = function MatSelectSearchComponent_Factory(t) {
    return new (t || _MatSelectSearchComponent)(ɵɵdirectiveInject(MatSelect), ɵɵdirectiveInject(ChangeDetectorRef), ɵɵdirectiveInject(ViewportRuler), ɵɵdirectiveInject(MatOption, 8), ɵɵdirectiveInject(MatFormField, 8), ɵɵdirectiveInject(MAT_SELECTSEARCH_DEFAULT_OPTIONS, 8));
  };
  static ɵcmp = ɵɵdefineComponent({
    type: _MatSelectSearchComponent,
    selectors: [["ngx-mat-select-search"]],
    contentQueries: function MatSelectSearchComponent_ContentQueries(rf, ctx, dirIndex) {
      if (rf & 1) {
        ɵɵcontentQuery(dirIndex, MatSelectSearchClearDirective, 5);
        ɵɵcontentQuery(dirIndex, MatSelectNoEntriesFoundDirective, 5);
      }
      if (rf & 2) {
        let _t;
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.clearIcon = _t.first);
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.noEntriesFound = _t.first);
      }
    },
    viewQuery: function MatSelectSearchComponent_Query(rf, ctx) {
      if (rf & 1) {
        ɵɵviewQuery(_c0, 7, ElementRef);
        ɵɵviewQuery(_c1, 7, ElementRef);
      }
      if (rf & 2) {
        let _t;
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.searchSelectInput = _t.first);
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.innerSelectSearch = _t.first);
      }
    },
    inputs: {
      placeholderLabel: "placeholderLabel",
      type: "type",
      closeIcon: "closeIcon",
      closeSvgIcon: "closeSvgIcon",
      noEntriesFoundLabel: "noEntriesFoundLabel",
      clearSearchInput: "clearSearchInput",
      searching: "searching",
      disableInitialFocus: "disableInitialFocus",
      enableClearOnEscapePressed: "enableClearOnEscapePressed",
      preventHomeEndKeyPropagation: "preventHomeEndKeyPropagation",
      disableScrollToActiveOnOptionsChanged: "disableScrollToActiveOnOptionsChanged",
      ariaLabel: "ariaLabel",
      showToggleAllCheckbox: "showToggleAllCheckbox",
      toggleAllCheckboxChecked: "toggleAllCheckboxChecked",
      toggleAllCheckboxIndeterminate: "toggleAllCheckboxIndeterminate",
      toggleAllCheckboxTooltipMessage: "toggleAllCheckboxTooltipMessage",
      toggleAllCheckboxTooltipPosition: "toggleAllCheckboxTooltipPosition",
      hideClearSearchButton: "hideClearSearchButton",
      alwaysRestoreSelectedOptionsMulti: "alwaysRestoreSelectedOptionsMulti",
      recreateValuesArray: "recreateValuesArray"
    },
    outputs: {
      toggleAll: "toggleAll"
    },
    features: [ɵɵProvidersFeature([{
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => _MatSelectSearchComponent),
      multi: true
    }])],
    ngContentSelectors: _c3,
    decls: 13,
    vars: 14,
    consts: [["innerSelectSearch", ""], ["searchSelectInput", ""], ["defaultIcon", ""], ["defaultNoEntriesFound", ""], ["matInput", "", 1, "mat-select-search-input", "mat-select-search-hidden"], [1, "mat-select-search-inner", "mat-typography", "mat-datepicker-content", "mat-tab-header", 3, "ngClass"], [1, "mat-select-search-inner-row"], ["class", "mat-select-search-toggle-all-checkbox", "matTooltipClass", "ngx-mat-select-search-toggle-all-tooltip", 3, "color", "checked", "indeterminate", "matTooltip", "matTooltipPosition", "change", 4, "ngIf"], ["autocomplete", "off", 1, "mat-select-search-input", 3, "keydown", "keyup", "blur", "type", "formControl", "placeholder"], ["class", "mat-select-search-spinner", "diameter", "16", 4, "ngIf"], ["mat-icon-button", "", "aria-label", "Clear", "class", "mat-select-search-clear", 3, "click", 4, "ngIf"], ["class", "mat-select-search-no-entries-found", 4, "ngIf"], ["matTooltipClass", "ngx-mat-select-search-toggle-all-tooltip", 1, "mat-select-search-toggle-all-checkbox", 3, "change", "color", "checked", "indeterminate", "matTooltip", "matTooltipPosition"], ["diameter", "16", 1, "mat-select-search-spinner"], ["mat-icon-button", "", "aria-label", "Clear", 1, "mat-select-search-clear", 3, "click"], [4, "ngIf", "ngIfElse"], [3, "svgIcon"], [1, "mat-select-search-no-entries-found"]],
    template: function MatSelectSearchComponent_Template(rf, ctx) {
      if (rf & 1) {
        const _r1 = ɵɵgetCurrentView();
        ɵɵprojectionDef(_c2);
        ɵɵelement(0, "input", 4);
        ɵɵelementStart(1, "div", 5, 0)(3, "div", 6);
        ɵɵtemplate(4, MatSelectSearchComponent_mat_checkbox_4_Template, 1, 5, "mat-checkbox", 7);
        ɵɵelementStart(5, "input", 8, 1);
        ɵɵlistener("keydown", function MatSelectSearchComponent_Template_input_keydown_5_listener($event) {
          ɵɵrestoreView(_r1);
          return ɵɵresetView(ctx._handleKeydown($event));
        })("keyup", function MatSelectSearchComponent_Template_input_keyup_5_listener($event) {
          ɵɵrestoreView(_r1);
          return ɵɵresetView(ctx._handleKeyup($event));
        })("blur", function MatSelectSearchComponent_Template_input_blur_5_listener() {
          ɵɵrestoreView(_r1);
          return ɵɵresetView(ctx.onBlur());
        });
        ɵɵelementEnd();
        ɵɵtemplate(7, MatSelectSearchComponent_mat_spinner_7_Template, 1, 0, "mat-spinner", 9)(8, MatSelectSearchComponent_button_8_Template, 4, 2, "button", 10);
        ɵɵprojection(9);
        ɵɵelementEnd();
        ɵɵelement(10, "mat-divider");
        ɵɵelementEnd();
        ɵɵtemplate(11, MatSelectSearchComponent_div_11_Template, 4, 2, "div", 11);
        ɵɵpipe(12, "async");
      }
      if (rf & 2) {
        ɵɵadvance();
        ɵɵproperty("ngClass", ɵɵpureFunction2(11, _c4, ctx.matSelect.multiple, ctx._isToggleAllCheckboxVisible()));
        ɵɵadvance(3);
        ɵɵproperty("ngIf", ctx._isToggleAllCheckboxVisible());
        ɵɵadvance();
        ɵɵproperty("type", ctx.type)("formControl", ctx._formControl)("placeholder", ctx.placeholderLabel);
        ɵɵattribute("aria-label", ctx.ariaLabel);
        ɵɵadvance(2);
        ɵɵproperty("ngIf", ctx.searching);
        ɵɵadvance();
        ɵɵproperty("ngIf", !ctx.hideClearSearchButton && ctx.value && !ctx.searching);
        ɵɵadvance(3);
        ɵɵproperty("ngIf", ɵɵpipeBind1(12, 9, ctx._showNoEntriesFound$));
      }
    },
    dependencies: [NgClass, NgIf, DefaultValueAccessor, NgControlStatus, FormControlDirective, MatIconButton, MatCheckbox, MatIcon, MatProgressSpinner, MatTooltip, MatDivider, AsyncPipe],
    styles: [".mat-select-search-hidden[_ngcontent-%COMP%]{visibility:hidden}.mat-select-search-inner[_ngcontent-%COMP%]{position:absolute;top:0;left:0;width:100%;z-index:100;font-size:inherit;box-shadow:none;background-color:var(--mat-select-panel-background-color)}.mat-select-search-inner.mat-select-search-inner-multiple.mat-select-search-inner-toggle-all[_ngcontent-%COMP%]   .mat-select-search-inner-row[_ngcontent-%COMP%]{display:flex;align-items:center}.mat-select-search-input[_ngcontent-%COMP%]{box-sizing:border-box;width:100%;border:none;font-family:inherit;font-size:inherit;color:currentColor;outline:none;background-color:var(--mat-select-panel-background-color);padding:0 44px 0 16px;height:calc(3em - 1px);line-height:calc(3em - 1px)}[dir=rtl][_nghost-%COMP%]   .mat-select-search-input[_ngcontent-%COMP%], [dir=rtl]   [_nghost-%COMP%]   .mat-select-search-input[_ngcontent-%COMP%]{padding-right:16px;padding-left:44px}.mat-select-search-input[_ngcontent-%COMP%]::placeholder{color:var(--mdc-filled-text-field-input-text-placeholder-color)}.mat-select-search-inner-toggle-all[_ngcontent-%COMP%]   .mat-select-search-input[_ngcontent-%COMP%]{padding-left:5px}.mat-select-search-no-entries-found[_ngcontent-%COMP%]{padding-top:8px}.mat-select-search-clear[_ngcontent-%COMP%]{position:absolute;right:4px;top:0}[dir=rtl][_nghost-%COMP%]   .mat-select-search-clear[_ngcontent-%COMP%], [dir=rtl]   [_nghost-%COMP%]   .mat-select-search-clear[_ngcontent-%COMP%]{right:auto;left:4px}.mat-select-search-spinner[_ngcontent-%COMP%]{position:absolute;right:16px;top:calc(50% - 8px)}[dir=rtl][_nghost-%COMP%]   .mat-select-search-spinner[_ngcontent-%COMP%], [dir=rtl]   [_nghost-%COMP%]   .mat-select-search-spinner[_ngcontent-%COMP%]{right:auto;left:16px}  .mat-mdc-option[aria-disabled=true].contains-mat-select-search{position:sticky;top:-8px;z-index:1;opacity:1;margin-top:-8px;pointer-events:all}  .mat-mdc-option[aria-disabled=true].contains-mat-select-search .mat-icon{margin-right:0;margin-left:0}  .mat-mdc-option[aria-disabled=true].contains-mat-select-search mat-pseudo-checkbox{display:none}  .mat-mdc-option[aria-disabled=true].contains-mat-select-search .mdc-list-item__primary-text{opacity:1}.mat-select-search-toggle-all-checkbox[_ngcontent-%COMP%]{padding-left:5px}[dir=rtl][_nghost-%COMP%]   .mat-select-search-toggle-all-checkbox[_ngcontent-%COMP%], [dir=rtl]   [_nghost-%COMP%]   .mat-select-search-toggle-all-checkbox[_ngcontent-%COMP%]{padding-left:0;padding-right:5px}"],
    changeDetection: 0
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(MatSelectSearchComponent, [{
    type: Component,
    args: [{
      selector: "ngx-mat-select-search",
      standalone: false,
      providers: [{
        provide: NG_VALUE_ACCESSOR,
        useExisting: forwardRef(() => MatSelectSearchComponent),
        multi: true
      }],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<!--
Copyright (c) 2018 Bithost GmbH All Rights Reserved.

Use of this source code is governed by an MIT-style license that can be
found in the LICENSE file at https://angular.io/license
-->
<!-- Placeholder to adjust vertical offset of the mat-option elements -->
<input matInput class="mat-select-search-input mat-select-search-hidden"/>

<!-- Note: the  mat-datepicker-content mat-tab-header are needed to inherit the material theme colors, see PR #22 -->
<div
      #innerSelectSearch
      class="mat-select-search-inner mat-typography mat-datepicker-content mat-tab-header"
      [ngClass]="{'mat-select-search-inner-multiple': matSelect.multiple, 'mat-select-search-inner-toggle-all': _isToggleAllCheckboxVisible() }">

  <div class="mat-select-search-inner-row">
    <mat-checkbox *ngIf="_isToggleAllCheckboxVisible()"
                  [color]="matFormField?.color"
                  class="mat-select-search-toggle-all-checkbox"
                  [checked]="toggleAllCheckboxChecked"
                  [indeterminate]="toggleAllCheckboxIndeterminate"
                  [matTooltip]="toggleAllCheckboxTooltipMessage"
                  matTooltipClass="ngx-mat-select-search-toggle-all-tooltip"
                  [matTooltipPosition]="toggleAllCheckboxTooltipPosition"
                  (change)="_emitSelectAllBooleanToParent($event.checked)"
    ></mat-checkbox>

    <input class="mat-select-search-input"
           autocomplete="off"
           [type]="type"
           [formControl]="_formControl"
           #searchSelectInput
           (keydown)="_handleKeydown($event)"
           (keyup)="_handleKeyup($event)"
           (blur)="onBlur()"
           [placeholder]="placeholderLabel"
           [attr.aria-label]="ariaLabel"
    />
    <mat-spinner *ngIf="searching"
            class="mat-select-search-spinner"
            diameter="16"></mat-spinner>

    <button *ngIf="!hideClearSearchButton && value && !searching"
            mat-icon-button
            aria-label="Clear"
            (click)="_reset(true)"
            class="mat-select-search-clear">
      <ng-content *ngIf="clearIcon; else defaultIcon" select="[ngxMatSelectSearchClear]"></ng-content>
      <ng-template #defaultIcon>
        <mat-icon [svgIcon]="closeSvgIcon">
          {{!closeSvgIcon ? closeIcon : null}}
        </mat-icon>
      </ng-template>
    </button>

    <ng-content select=".mat-select-search-custom-header-content"></ng-content>
  </div>

  <mat-divider></mat-divider>
</div>

<div *ngIf="_showNoEntriesFound$ | async"
     class="mat-select-search-no-entries-found">
  <ng-content *ngIf="noEntriesFound; else defaultNoEntriesFound"
              select="[ngxMatSelectNoEntriesFound]"></ng-content>
  <ng-template #defaultNoEntriesFound>{{noEntriesFoundLabel}}</ng-template>
</div>

`,
      styles: [".mat-select-search-hidden{visibility:hidden}.mat-select-search-inner{position:absolute;top:0;left:0;width:100%;z-index:100;font-size:inherit;box-shadow:none;background-color:var(--mat-select-panel-background-color)}.mat-select-search-inner.mat-select-search-inner-multiple.mat-select-search-inner-toggle-all .mat-select-search-inner-row{display:flex;align-items:center}.mat-select-search-input{box-sizing:border-box;width:100%;border:none;font-family:inherit;font-size:inherit;color:currentColor;outline:none;background-color:var(--mat-select-panel-background-color);padding:0 44px 0 16px;height:calc(3em - 1px);line-height:calc(3em - 1px)}:host-context([dir=rtl]) .mat-select-search-input{padding-right:16px;padding-left:44px}.mat-select-search-input::placeholder{color:var(--mdc-filled-text-field-input-text-placeholder-color)}.mat-select-search-inner-toggle-all .mat-select-search-input{padding-left:5px}.mat-select-search-no-entries-found{padding-top:8px}.mat-select-search-clear{position:absolute;right:4px;top:0}:host-context([dir=rtl]) .mat-select-search-clear{right:auto;left:4px}.mat-select-search-spinner{position:absolute;right:16px;top:calc(50% - 8px)}:host-context([dir=rtl]) .mat-select-search-spinner{right:auto;left:16px}::ng-deep .mat-mdc-option[aria-disabled=true].contains-mat-select-search{position:sticky;top:-8px;z-index:1;opacity:1;margin-top:-8px;pointer-events:all}::ng-deep .mat-mdc-option[aria-disabled=true].contains-mat-select-search .mat-icon{margin-right:0;margin-left:0}::ng-deep .mat-mdc-option[aria-disabled=true].contains-mat-select-search mat-pseudo-checkbox{display:none}::ng-deep .mat-mdc-option[aria-disabled=true].contains-mat-select-search .mdc-list-item__primary-text{opacity:1}.mat-select-search-toggle-all-checkbox{padding-left:5px}:host-context([dir=rtl]) .mat-select-search-toggle-all-checkbox{padding-left:0;padding-right:5px}\n"]
    }]
  }], () => [{
    type: MatSelect,
    decorators: [{
      type: Inject,
      args: [MatSelect]
    }]
  }, {
    type: ChangeDetectorRef
  }, {
    type: ViewportRuler
  }, {
    type: MatOption,
    decorators: [{
      type: Optional
    }, {
      type: Inject,
      args: [MatOption]
    }]
  }, {
    type: MatFormField,
    decorators: [{
      type: Optional
    }, {
      type: Inject,
      args: [MatFormField]
    }]
  }, {
    type: void 0,
    decorators: [{
      type: Optional
    }, {
      type: Inject,
      args: [MAT_SELECTSEARCH_DEFAULT_OPTIONS]
    }]
  }], {
    placeholderLabel: [{
      type: Input
    }],
    type: [{
      type: Input
    }],
    closeIcon: [{
      type: Input
    }],
    closeSvgIcon: [{
      type: Input
    }],
    noEntriesFoundLabel: [{
      type: Input
    }],
    clearSearchInput: [{
      type: Input
    }],
    searching: [{
      type: Input
    }],
    disableInitialFocus: [{
      type: Input
    }],
    enableClearOnEscapePressed: [{
      type: Input
    }],
    preventHomeEndKeyPropagation: [{
      type: Input
    }],
    disableScrollToActiveOnOptionsChanged: [{
      type: Input
    }],
    ariaLabel: [{
      type: Input
    }],
    showToggleAllCheckbox: [{
      type: Input
    }],
    toggleAllCheckboxChecked: [{
      type: Input
    }],
    toggleAllCheckboxIndeterminate: [{
      type: Input
    }],
    toggleAllCheckboxTooltipMessage: [{
      type: Input
    }],
    toggleAllCheckboxTooltipPosition: [{
      type: Input
    }],
    hideClearSearchButton: [{
      type: Input
    }],
    alwaysRestoreSelectedOptionsMulti: [{
      type: Input
    }],
    recreateValuesArray: [{
      type: Input
    }],
    toggleAll: [{
      type: Output
    }],
    searchSelectInput: [{
      type: ViewChild,
      args: ["searchSelectInput", {
        read: ElementRef,
        static: true
      }]
    }],
    innerSelectSearch: [{
      type: ViewChild,
      args: ["innerSelectSearch", {
        read: ElementRef,
        static: true
      }]
    }],
    clearIcon: [{
      type: ContentChild,
      args: [MatSelectSearchClearDirective]
    }],
    noEntriesFound: [{
      type: ContentChild,
      args: [MatSelectNoEntriesFoundDirective]
    }]
  });
})();
var MatSelectSearchVersion = "8.0.0";
var NgxMatSelectSearchModule = class _NgxMatSelectSearchModule {
  static ɵfac = function NgxMatSelectSearchModule_Factory(t) {
    return new (t || _NgxMatSelectSearchModule)();
  };
  static ɵmod = ɵɵdefineNgModule({
    type: _NgxMatSelectSearchModule,
    declarations: [MatSelectSearchComponent, MatSelectSearchClearDirective, MatSelectNoEntriesFoundDirective],
    imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatCheckboxModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule, MatDividerModule],
    exports: [MatSelectSearchComponent, MatSelectSearchClearDirective, MatSelectNoEntriesFoundDirective]
  });
  static ɵinj = ɵɵdefineInjector({
    imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatCheckboxModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule, MatDividerModule]
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NgxMatSelectSearchModule, [{
    type: NgModule,
    args: [{
      imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatCheckboxModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule, MatDividerModule],
      declarations: [MatSelectSearchComponent, MatSelectSearchClearDirective, MatSelectNoEntriesFoundDirective],
      exports: [MatSelectSearchComponent, MatSelectSearchClearDirective, MatSelectNoEntriesFoundDirective]
    }]
  }], null, null);
})();
export {
  MAT_SELECTSEARCH_DEFAULT_OPTIONS,
  MatSelectNoEntriesFoundDirective,
  MatSelectSearchClearDirective,
  MatSelectSearchComponent,
  MatSelectSearchVersion,
  NgxMatSelectSearchModule,
  configurableDefaultOptions
};
//# sourceMappingURL=ngx-mat-select-search.js.map
