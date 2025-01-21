import {
  DateTime,
  Info
} from "./chunk-64ULTU3P.js";
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE
} from "./chunk-SY25IENV.js";
import "./chunk-KMOH7D67.js";
import "./chunk-3GVUJYIC.js";
import "./chunk-6OHRNTD2.js";
import "./chunk-GMQF2XSW.js";
import "./chunk-UGY4PVCA.js";
import {
  Inject,
  Injectable,
  InjectionToken,
  NgModule,
  Optional,
  setClassMetadata,
  ɵɵdefineInjectable,
  ɵɵdefineInjector,
  ɵɵdefineNgModule,
  ɵɵinject
} from "./chunk-VPZHWU2R.js";
import "./chunk-WSA2QMXP.js";
import "./chunk-PZQZAEDH.js";

// node_modules/@angular/material-luxon-adapter/fesm2022/material-luxon-adapter.mjs
var MAT_LUXON_DATE_ADAPTER_OPTIONS = new InjectionToken("MAT_LUXON_DATE_ADAPTER_OPTIONS", {
  providedIn: "root",
  factory: MAT_LUXON_DATE_ADAPTER_OPTIONS_FACTORY
});
function MAT_LUXON_DATE_ADAPTER_OPTIONS_FACTORY() {
  return {
    useUtc: false,
    firstDayOfWeek: 0,
    defaultOutputCalendar: "gregory"
  };
}
function range(length, valueFunction) {
  const valuesArray = Array(length);
  for (let i = 0; i < length; i++) {
    valuesArray[i] = valueFunction(i);
  }
  return valuesArray;
}
var _LuxonDateAdapter = class _LuxonDateAdapter extends DateAdapter {
  constructor(dateLocale, options) {
    super();
    this._useUTC = !!options?.useUtc;
    this._firstDayOfWeek = options?.firstDayOfWeek || 0;
    this._defaultOutputCalendar = options?.defaultOutputCalendar || "gregory";
    this.setLocale(dateLocale || DateTime.local().locale);
  }
  getYear(date) {
    return date.year;
  }
  getMonth(date) {
    return date.month - 1;
  }
  getDate(date) {
    return date.day;
  }
  getDayOfWeek(date) {
    return date.weekday;
  }
  getMonthNames(style) {
    return Info.months(style, {
      locale: this.locale,
      outputCalendar: this._defaultOutputCalendar
    });
  }
  getDateNames() {
    const dtf = new Intl.DateTimeFormat(this.locale, {
      day: "numeric",
      timeZone: "utc"
    });
    return range(31, (i) => dtf.format(DateTime.utc(2017, 1, i + 1).toJSDate()));
  }
  getDayOfWeekNames(style) {
    const days = Info.weekdays(style, {
      locale: this.locale
    });
    days.unshift(days.pop());
    return days;
  }
  getYearName(date) {
    return date.toFormat("yyyy", this._getOptions());
  }
  getFirstDayOfWeek() {
    return this._firstDayOfWeek;
  }
  getNumDaysInMonth(date) {
    return date.daysInMonth;
  }
  clone(date) {
    return DateTime.fromObject(date.toObject(), this._getOptions());
  }
  createDate(year, month, date) {
    const options = this._getOptions();
    if (month < 0 || month > 11) {
      throw Error(`Invalid month index "${month}". Month index has to be between 0 and 11.`);
    }
    if (date < 1) {
      throw Error(`Invalid date "${date}". Date has to be greater than 0.`);
    }
    const result = this._useUTC ? DateTime.utc(year, month + 1, date, options) : DateTime.local(year, month + 1, date, options);
    if (!this.isValid(result)) {
      throw Error(`Invalid date "${date}". Reason: "${result.invalidReason}".`);
    }
    return result;
  }
  today() {
    const options = this._getOptions();
    return this._useUTC ? DateTime.utc(options) : DateTime.local(options);
  }
  parse(value, parseFormat) {
    const options = this._getOptions();
    if (typeof value == "string" && value.length > 0) {
      const iso8601Date = DateTime.fromISO(value, options);
      if (this.isValid(iso8601Date)) {
        return iso8601Date;
      }
      const formats = Array.isArray(parseFormat) ? parseFormat : [parseFormat];
      if (!parseFormat.length) {
        throw Error("Formats array must not be empty.");
      }
      for (const format of formats) {
        const fromFormat = DateTime.fromFormat(value, format, options);
        if (this.isValid(fromFormat)) {
          return fromFormat;
        }
      }
      return this.invalid();
    } else if (typeof value === "number") {
      return DateTime.fromMillis(value, options);
    } else if (value instanceof Date) {
      return DateTime.fromJSDate(value, options);
    } else if (value instanceof DateTime) {
      return DateTime.fromMillis(value.toMillis(), options);
    }
    return null;
  }
  format(date, displayFormat) {
    if (!this.isValid(date)) {
      throw Error("LuxonDateAdapter: Cannot format invalid date.");
    }
    if (this._useUTC) {
      return date.setLocale(this.locale).setZone("utc").toFormat(displayFormat);
    } else {
      return date.setLocale(this.locale).toFormat(displayFormat);
    }
  }
  addCalendarYears(date, years) {
    return date.reconfigure(this._getOptions()).plus({
      years
    });
  }
  addCalendarMonths(date, months) {
    return date.reconfigure(this._getOptions()).plus({
      months
    });
  }
  addCalendarDays(date, days) {
    return date.reconfigure(this._getOptions()).plus({
      days
    });
  }
  toIso8601(date) {
    return date.toISO();
  }
  /**
   * Returns the given value if given a valid Luxon or null. Deserializes valid ISO 8601 strings
   * (https://www.ietf.org/rfc/rfc3339.txt) and valid Date objects into valid DateTime and empty
   * string into null. Returns an invalid date for all other values.
   */
  deserialize(value) {
    const options = this._getOptions();
    let date;
    if (value instanceof Date) {
      date = DateTime.fromJSDate(value, options);
    }
    if (typeof value === "string") {
      if (!value) {
        return null;
      }
      date = DateTime.fromISO(value, options);
    }
    if (date && this.isValid(date)) {
      return date;
    }
    return super.deserialize(value);
  }
  isDateInstance(obj) {
    return obj instanceof DateTime;
  }
  isValid(date) {
    return date.isValid;
  }
  invalid() {
    return DateTime.invalid("Invalid Luxon DateTime object.");
  }
  /** Gets the options that should be used when constructing a new `DateTime` object. */
  _getOptions() {
    return {
      zone: this._useUTC ? "utc" : void 0,
      locale: this.locale,
      outputCalendar: this._defaultOutputCalendar
    };
  }
};
_LuxonDateAdapter.ɵfac = function LuxonDateAdapter_Factory(t) {
  return new (t || _LuxonDateAdapter)(ɵɵinject(MAT_DATE_LOCALE, 8), ɵɵinject(MAT_LUXON_DATE_ADAPTER_OPTIONS, 8));
};
_LuxonDateAdapter.ɵprov = ɵɵdefineInjectable({
  token: _LuxonDateAdapter,
  factory: _LuxonDateAdapter.ɵfac
});
var LuxonDateAdapter = _LuxonDateAdapter;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(LuxonDateAdapter, [{
    type: Injectable
  }], () => [{
    type: void 0,
    decorators: [{
      type: Optional
    }, {
      type: Inject,
      args: [MAT_DATE_LOCALE]
    }]
  }, {
    type: void 0,
    decorators: [{
      type: Optional
    }, {
      type: Inject,
      args: [MAT_LUXON_DATE_ADAPTER_OPTIONS]
    }]
  }], null);
})();
var MAT_LUXON_DATE_FORMATS = {
  parse: {
    dateInput: "D"
  },
  display: {
    dateInput: "D",
    monthYearLabel: "LLL yyyy",
    dateA11yLabel: "DD",
    monthYearA11yLabel: "LLLL yyyy"
  }
};
var _LuxonDateModule = class _LuxonDateModule {
};
_LuxonDateModule.ɵfac = function LuxonDateModule_Factory(t) {
  return new (t || _LuxonDateModule)();
};
_LuxonDateModule.ɵmod = ɵɵdefineNgModule({
  type: _LuxonDateModule
});
_LuxonDateModule.ɵinj = ɵɵdefineInjector({
  providers: [{
    provide: DateAdapter,
    useClass: LuxonDateAdapter,
    deps: [MAT_DATE_LOCALE, MAT_LUXON_DATE_ADAPTER_OPTIONS]
  }]
});
var LuxonDateModule = _LuxonDateModule;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(LuxonDateModule, [{
    type: NgModule,
    args: [{
      providers: [{
        provide: DateAdapter,
        useClass: LuxonDateAdapter,
        deps: [MAT_DATE_LOCALE, MAT_LUXON_DATE_ADAPTER_OPTIONS]
      }]
    }]
  }], null, null);
})();
var _MatLuxonDateModule = class _MatLuxonDateModule {
};
_MatLuxonDateModule.ɵfac = function MatLuxonDateModule_Factory(t) {
  return new (t || _MatLuxonDateModule)();
};
_MatLuxonDateModule.ɵmod = ɵɵdefineNgModule({
  type: _MatLuxonDateModule
});
_MatLuxonDateModule.ɵinj = ɵɵdefineInjector({
  providers: [provideLuxonDateAdapter()]
});
var MatLuxonDateModule = _MatLuxonDateModule;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(MatLuxonDateModule, [{
    type: NgModule,
    args: [{
      providers: [provideLuxonDateAdapter()]
    }]
  }], null, null);
})();
function provideLuxonDateAdapter(formats = MAT_LUXON_DATE_FORMATS) {
  return [{
    provide: DateAdapter,
    useClass: LuxonDateAdapter,
    deps: [MAT_DATE_LOCALE, MAT_LUXON_DATE_ADAPTER_OPTIONS]
  }, {
    provide: MAT_DATE_FORMATS,
    useValue: formats
  }];
}
export {
  LuxonDateAdapter,
  LuxonDateModule,
  MAT_LUXON_DATE_ADAPTER_OPTIONS,
  MAT_LUXON_DATE_ADAPTER_OPTIONS_FACTORY,
  MAT_LUXON_DATE_FORMATS,
  MatLuxonDateModule,
  provideLuxonDateAdapter
};
//# sourceMappingURL=@angular_material-luxon-adapter.js.map
