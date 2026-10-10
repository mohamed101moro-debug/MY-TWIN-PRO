module.exports = { 
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
  Stack: { Screen: 'Stack.Screen', Navigator: 'Stack.Navigator' },
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
  Href: {},
};
