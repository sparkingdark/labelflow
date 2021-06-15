import { useRef, useState } from "react";
import { useRouter } from "next/router";
import { RouterContext } from "next/dist/next-server/lib/router-context";
import { Extent, getCenter } from "ol/extent";
import { Size } from "ol/size";
import memoize from "mem";
import Projection from "ol/proj/Projection";
import useMeasure from "react-use-measure";
import { ApolloProvider, useApolloClient, useQuery } from "@apollo/client";

import gql from "graphql-tag";

import { Map } from "@labelflow/react-openlayers-fiber";
import type { Image } from "../../../graphql-types.generated";
import "ol/ol.css";

import { DrawBoundingBoxInteraction } from "./draw-bounding-box-interaction";
import { SelectInteraction } from "./select-interaction";
import { Labels } from "./labels";
import { EditLabelClass } from "./edit-label-class";

const empty: any[] = [];

/**
 * Padding around the openlayers view
 * [top, right, bottom, left] in pixels
 * See https://openlayers.org/en/latest/apidoc/module-ol_View-View.html#padding
 */
const viewPadding = [72, 72, 72, 72];

/**
 * Standard projection, the same for all images, with arbitrary extent
 */
const standardProjection = new Projection({
  code: "standardImageStaticProjection",
  units: "pixels",
});

/**
 * Memoize openlayers parameters that we pass to the open layers components
 */
const getMemoizedProperties = memoize(
  (_imageId, image: Pick<Image, "id" | "url" | "width" | "height">) => {
    const { url, width, height } = image;
    const size: Size = [width, height];
    const extent: Extent = [0, 0, width, height];
    const center = getCenter(extent);
    const projection = standardProjection;
    // We could also use an image-specific projection, as in openlayers examples:
    // It seems that we don't need it for now, but we might find that having a single global projection
    /// creates problem later on. So for now let's keep this option commented
    //     const projection = new Projection({
    //       code: imageId,
    //       units: "pixels",
    //       extent,
    //     });

    return { url, width, height, size, extent, center, projection };
  }
);

const imageQuery = gql`
  query image($id: ID!) {
    image(where: { id: $id }) {
      id
      width
      height
      url
    }
  }
`;

export const OpenlayersMap = () => {
  const [editClass, setEditClass] = useState(false);
  const editClassOverlayRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const imageId = router.query?.id;

  const image = useQuery<{
    image: Pick<Image, "id" | "url" | "width" | "height">;
  }>(imageQuery, {
    variables: { id: imageId },
    skip: typeof imageId !== "string",
  }).data?.image;

  const client = useApolloClient();
  const [containerRef, bounds] = useMeasure();

  const isBoundsValid = bounds.width > 0 || bounds.height > 0;

  if (image == null) {
    return null;
  }

  const { url, size, extent, center, projection, width, height } =
    getMemoizedProperties(image.id, image);

  const resolution = Math.max(
    width / (bounds.width - viewPadding[1] - viewPadding[3]),
    height / (bounds.height - viewPadding[0] - viewPadding[2])
  );

  return (
    <>
      <div
        style={{ display: "flex", width: "100%", height: "100%" }}
        onContextMenu={(e) => {
          e.preventDefault();
          return false;
        }}
      >
        <Map
          args={{ controls: empty }}
          style={{ height: "100%", width: "100%" }}
          containerRef={containerRef}
        >
          {/* Need to bridge contexts across renderers
           * See https://github.com/facebook/react/issues/17275 */}
          <RouterContext.Provider value={router}>
            <ApolloProvider client={client}>
              {
                // Before useMeasure has time to properly measure the div, we have a negative resolution,
                // There is no point rendering the view in that case
                isBoundsValid && (
                  <olView
                    args={{ extent }}
                    center={center}
                    initialProjection={projection}
                    resolution={resolution}
                    // Max zoom = 16 pixels of screen per pixel of image
                    minResolution={1.0 / 16.0}
                    maxResolution={resolution}
                    constrainOnlyCenter
                    showFullExtent
                    padding={viewPadding}
                  />
                )
              }
              <olLayerImage extent={extent}>
                {url != null && (
                  <olSourceImageStatic
                    // ol/source/image does not have `setXXX` methods, only options in the constructor, so
                    // to change anything, you need to recreate the object. So we pass all in args.
                    // See https://openlayers.org/en/latest/apidoc/module-ol_source_Image.ImageSourceEvent.html
                    args={{
                      url,
                      imageExtent: extent,
                      imageSize: size,
                      projection,
                      crossOrigin: "anonymous",
                    }}
                  />
                )}
              </olLayerImage>

              <Labels />
              <DrawBoundingBoxInteraction />
              <SelectInteraction
                editClassOverlayRef={editClassOverlayRef}
                setEditClass={setEditClass}
              />
            </ApolloProvider>
          </RouterContext.Provider>
        </Map>
        <EditLabelClass
          ref={editClassOverlayRef}
          isOpen={editClass}
          onClose={() => setEditClass(false)}
        />
      </div>
    </>
  );
};
