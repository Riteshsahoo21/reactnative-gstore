/* eslint-disable prettier/prettier */
import {NavigationAction} from '@react-navigation/native';

let _container;

const setContainer = container => {
  _container = container;
};

const reset = (routeName, params) => {
  _container.dispatch(
    NavigationAction.reset({
      index: 0,
      actions: [
        NavigationAction.navigate({
          type: 'Navigation/NAVIGATE',
          routeName,
          params,
        }),
      ],
    }),
  );
};

const navigate = (routeName, params) => {
  _container.dispatch(
    NavigationAction.navigate({
      type: 'Navigation/NAVIGATE',
      routeName,
      params,
    }),
  );
};

const navigateDeep = actions => {
  _container.dispatch(
    actions.reduceRight(
      (prevAction, action) =>
        NavigationAction.navigate({
          type: 'Navigation/NAVIGATE',
          routeName: action.routeName,
          params: action.params,
          action: prevAction,
        }),
      undefined,
    ),
  );
};

const getCurrentRoute = () => {
  if (!_container || !_container.state.nav) {
    return null;
  }

  return _container.state.nav.routes[_container.state.nav.index];
};

export default {
  setContainer,
  navigateDeep,
  navigate,
  reset,
  getCurrentRoute,
};
