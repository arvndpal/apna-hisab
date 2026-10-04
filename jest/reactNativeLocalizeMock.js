module.exports = {
  findBestLanguageTag: () => ({ languageTag: 'en', isRTL: false }),
  getLocales: () => [{ languageCode: 'en', countryCode: 'US', languageTag: 'en-US', isRTL: false }],
  getNumberFormatSettings: () => ({ decimalSeparator: '.', groupingSeparator: ',' }),
  getCalendar: () => 'gregorian',
  getCountry: () => 'US',
  getCurrencies: () => ['USD'],
  getTemperatureUnit: () => 'celsius',
  getTimeZone: () => 'UTC',
  uses24HourClock: () => true,
  usesMetricSystem: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
};
