// Jest-only stand-in for react-native-html-to-pdf (native TurboModule).
module.exports = { generatePDF: () => Promise.resolve({ filePath: '/tmp/test.pdf' }) };
