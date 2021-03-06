/* eslint react/no-danger:0 */
import React, {PropTypes} from 'react';
import {Provider} from 'react-redux';
import {RouterContext} from 'react-router';
import {renderToString} from 'react-dom/server';
import makeSegmentSnippet from '@segment/snippet';
import {auth0} from 'universal/utils/clientOptions';
import getWebpackPublicPath from 'server/utils/getWebpackPublicPath';

const webpackPublicPath = getWebpackPublicPath();
const segKey = process.env.SEGMENT_WRITE_KEY;
const segmentSnippet = segKey && makeSegmentSnippet.min({
  host: 'cdn.segment.com',
  apiKey: segKey
});

// Injects the server rendered state and app into a basic html template
export default function Html({store, entries, StyleSheetServer, renderProps}) {
  const {manifest, app, vendor} = entries;
  // TURN ON WHEN WE SEND STATE TO CLIENT
  // const initialState = `window.__INITIAL_STATE__ = ${JSON.stringify(store.getState())}`;
  // <script dangerouslySetInnerHTML={{__html: initialState}}/>
  const {html, css} = StyleSheetServer.renderStatic(() => {
    try {
      return renderToString(
        <Provider store={store}>
          <RouterContext {...renderProps} />
        </Provider>
      );
    } catch (e) {
      console.log(`SSR exception: ${e}`);
      console.trace();
      return '<div>Error during render!</div>';
    }
  });
  const dehydratedStyles = `window.__APHRODITE__ = ${JSON.stringify(css.renderedClassNames)}`;
  const clientOptions = `
    window.__ACTION__ = {
      auth0: ${JSON.stringify(auth0)},
      cdn: ${JSON.stringify(webpackPublicPath)},
      sentry: ${JSON.stringify(process.env.SENTRY_DSN_PUBLIC)}
    };
`;
  const fontAwesomeUrl = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css';
  return (
    <html>
      <head>
        <style data-aphrodite dangerouslySetInnerHTML={{__html: css.content}}/>
        <link rel="stylesheet" type="text/css" href={fontAwesomeUrl}/>
        {/* segment.io analytics */}
        <script type="text/javascript" dangerouslySetInnerHTML={{__html: segmentSnippet}}/>
        {/* sentry.io error reporting */}
        <script src="https://cdn.ravenjs.com/3.7.0/raven.min.js" crossOrigin="anonymous"/>
      </head>
      <body>
        <script dangerouslySetInnerHTML={{__html: dehydratedStyles}}/>
        <script dangerouslySetInnerHTML={{__html: clientOptions}}/>
        <div id="root" dangerouslySetInnerHTML={{__html: html}}></div>
        <script dangerouslySetInnerHTML={{__html: manifest.text}}/>
        <script src={`${webpackPublicPath}${vendor.js}`}/>
        <script src={`${webpackPublicPath}${app.js}`}/>
      </body>
    </html>
  );
}

Html.propTypes = {
  StyleSheetServer: PropTypes.object,
  store: PropTypes.object.isRequired,
  entries: PropTypes.object,
  renderProps: PropTypes.object
};
