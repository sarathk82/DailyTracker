module.exports = {
  readAsStringAsync: jest.fn(async () => ''),
  writeAsStringAsync: jest.fn(async () => {}),
  deleteAsync: jest.fn(async () => {}),
  getInfoAsync: jest.fn(async () => ({ exists: false })),
  documentDirectory: '/mock/documents/',
  cacheDirectory: '/mock/cache/',
};
