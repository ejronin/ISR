(function oldValidAtlasApplication(globalObject) {
  'use strict';
  const APPLICATION_VERSION = 'atlas-public-shell-v1';
  globalObject.ATLAS_SPLIT_RELEASE_OLD_EXECUTED = true;
  globalObject.ATLAS_PUBLIC_STATE = {
    status: 'ready',
    hybrid: true,
    applicationVersion: APPLICATION_VERSION
  };
}(typeof globalThis !== 'undefined' ? globalThis : this));
