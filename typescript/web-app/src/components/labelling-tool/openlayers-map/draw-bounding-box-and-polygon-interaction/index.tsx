import { useMemo, useRef, useCallback, useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Draw as OlDraw } from "ol/interaction";
import { createBox, DrawEvent } from "ol/interaction/Draw";
import GeoJSON from "ol/format/GeoJSON";
import { Fill, Stroke, Style } from "ol/style";
import GeometryType from "ol/geom/GeometryType";
import { useApolloClient, useQuery, gql, useMutation } from "@apollo/client";

import { useToast } from "@chakra-ui/react";

import { useHotkeys } from "react-hotkeys-hook";
import { Feature, MapBrowserEvent } from "ol";
import { Geometry, Point, Polygon } from "ol/geom";
import { Coordinate } from "ol/coordinate";
import CircleStyle from "ol/style/Circle";
import {
  useLabellingStore,
  Tools,
  DrawingToolState,
} from "../../../../connectors/labelling-state";
import { keymap } from "../../../../keymap";
import { useUndoStore } from "../../../../connectors/undo-store";
import { noneClassColor } from "../../../../utils/class-color-generator";
import { createLabelEffect } from "./create-label-effect";
import { LabelType } from "../../../../graphql-types.generated";
import { updateLabelEffect } from "../select-and-modify-feature/update-label-effect";

const labelClassQuery = gql`
  query getLabelClass($id: ID!) {
    labelClass(where: { id: $id }) {
      id
      name
      color
    }
  }
`;

const imageQuery = gql`
  query getImage($id: ID!) {
    image(where: { id: $id }) {
      id
      url
    }
  }
`;

const iogInferenceMutation = gql`
  mutation iogInference(
    $id: ID!
    $imageUrl: String!
    $x: Float!
    $y: Float!
    $width: Float!
    $height: Float!
  ) {
    iogInference(
      data: {
        id: $id
        imageUrl: $imageUrl
        x: $x
        y: $y
        width: $width
        height: $height
      }
    ) {
      polygons
    }
  }
`;

const iogRefinementMutation = gql`
  mutation iogRefinement(
    $id: ID!
    $pointsInside: [[Float!]]
    $pointsOutside: [[Float!]]
  ) {
    iogRefinement(
      data: {
        id: $id
        pointsInside: $pointsInside
        pointsOutside: $pointsOutside
      }
    ) {
      polygons
    }
  }
`;

const geometryFunction = createBox();

export const DrawBoundingBoxAndPolygonInteraction = () => {
  const drawRef = useRef<OlDraw>(null);
  const client = useApolloClient();
  const { imageId } = useRouter()?.query;

  const [pointsInside, setPointsInside] = useState<Coordinate[]>([]);
  const [pointsOutside, setPointsOutside] = useState<Coordinate[]>([]);

  const selectedTool = useLabellingStore((state) => state.selectedTool);

  const setDrawingToolState = useLabellingStore(
    (state) => state.setDrawingToolState
  );
  const setSelectedLabelId = useLabellingStore(
    (state) => state.setSelectedLabelId
  );
  const selectedLabelClassId = useLabellingStore(
    (state) => state.selectedLabelClassId
  );
  const { data: dataLabelClass } = useQuery(labelClassQuery, {
    variables: { id: selectedLabelClassId },
    skip: selectedLabelClassId == null,
  });
  const { data: dataImage } = useQuery(imageQuery, {
    variables: { id: imageId },
    skip: imageId == null,
  });
  const { perform } = useUndoStore();

  const selectedLabelClass = dataLabelClass?.labelClass;

  const selectedLabelId = useLabellingStore((state) => state.selectedLabelId);

  useEffect(() => {
    setPointsInside([]);
    setPointsOutside([]);
  }, [imageId]);

  useHotkeys(
    keymap.cancelAction.key,
    () => drawRef.current?.abortDrawing(),
    {},
    [drawRef]
  );

  const toast = useToast();

  const errorMessage =
    selectedTool === Tools.POLYGON
      ? "Error creating polygon"
      : "Error creating bounding box";

  const performIOGRefinement = async () => {
    if (dataImage?.image != null && selectedLabelId != null) {
      const inferencePromise = (async () => {
        const { data } = await client.mutate({
          mutation: iogRefinementMutation,
          variables: {
            id: selectedLabelId,
            pointsInside,
            pointsOutside,
          },
        });

        return updateLabelEffect(
          {
            geometry: {
              type: "Polygon",
              coordinates: data?.iogRefinement?.polygons,
            },
            labelId: selectedLabelId,
            imageId: dataImage?.image?.id,
          },
          { client }
        ).do();
      })();

      try {
        await inferencePromise;
      } catch (error) {
        toast({
          title: errorMessage,
          description: error?.message,
          isClosable: true,
          status: "error",
          position: "bottom-right",
          duration: 10000,
        });
      }
    }
  };

  useEffect(() => {
    performIOGRefinement();
  }, [pointsInside, pointsOutside]);

  const style = useMemo(() => {
    const color = selectedLabelClass?.color ?? noneClassColor;

    return new Style({
      fill: new Fill({
        color: `${color}10`,
      }),
      stroke: new Stroke({
        color,
        width: 2,
      }),
    });
  }, [selectedLabelClass?.color]);

  const createPointInsideOrOutside = useCallback(
    (event: MapBrowserEvent<UIEvent>) => {
      const { map } = event;

      const idOfClickedFeature = map.forEachFeatureAtPixel(
        event.pixel,
        (feature) => feature.getProperties().id
      );

      if (idOfClickedFeature === selectedLabelId) {
        setPointsOutside((previousPoints) => [
          ...previousPoints,
          event.coordinate,
        ]);
      } else {
        setPointsInside((previousPoints) => [
          ...previousPoints,
          event.coordinate,
        ]);
      }

      return false;
    },
    [selectedLabelId]
  );

  if (![Tools.BOX, Tools.POLYGON, Tools.IOG].includes(selectedTool)) {
    return null;
  }
  if (typeof imageId !== "string") {
    return null;
  }
  const interactionDrawArguments =
    selectedTool === Tools.POLYGON
      ? {
          type: GeometryType.POLYGON,
          style, // Needed here to trigger the rerender of the component when the selected class changes
        }
      : {
          type: GeometryType.CIRCLE,
          geometryFunction,
          style, // Needed here to trigger the rerender of the component when the selected class changes
        };

  const createLabelFromDrawEvent = async (drawEvent: DrawEvent) => {
    const geometry = new GeoJSON().writeGeometryObject(
      drawEvent.feature.getGeometry()
    ) as GeoJSON.Polygon;
    const createLabelPromise = perform(
      createLabelEffect(
        {
          imageId,
          selectedLabelClassId,
          geometry,
          labelType:
            selectedTool === Tools.POLYGON ? LabelType.Polygon : LabelType.Box,
        },
        {
          setSelectedLabelId,
          client,
        }
      )
    );
    setDrawingToolState(DrawingToolState.IDLE);
    try {
      await createLabelPromise;
    } catch (error) {
      toast({
        title: errorMessage,
        description: error?.message,
        isClosable: true,
        status: "error",
        position: "bottom-right",
        duration: 10000,
      });
    }
  };

  const performIOGFromDrawEvent = async (drawEvent: DrawEvent) => {
    const openLayersGeometry = drawEvent.feature.getGeometry();
    const geometry = new GeoJSON().writeGeometryObject(
      openLayersGeometry
    ) as GeoJSON.Polygon;
    const labelIdPromise = createLabelEffect(
      {
        imageId,
        selectedLabelClassId,
        geometry,
        labelType: LabelType.Polygon,
      },
      {
        setSelectedLabelId,
        client,
      }
    ).do();
    const inferencePromise = (async () => {
      const dataUrl = await (async function () {
        const blob = await fetch(dataImage?.image?.url).then((r) => r.blob());
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      })();
      const [x, y, xMax, yMax] = openLayersGeometry.getExtent();
      const { data } = await client.mutate({
        mutation: iogInferenceMutation,
        variables: {
          id: await labelIdPromise,
          x,
          y,
          height: yMax - y,
          width: xMax - x,
          imageUrl: dataUrl,
        },
      });

      return updateLabelEffect(
        {
          geometry: {
            type: "Polygon",
            coordinates: data?.iogInference?.polygons,
          },
          labelId: await labelIdPromise,
          imageId,
        },
        { client }
      ).do();
    })();

    setDrawingToolState(DrawingToolState.IDLE);
    try {
      await inferencePromise;
    } catch (error) {
      toast({
        title: errorMessage,
        description: error?.message,
        isClosable: true,
        status: "error",
        position: "bottom-right",
        duration: 10000,
      });
    }
  };

  return selectedTool !== Tools.IOG ||
    (selectedTool === Tools.IOG && selectedLabelId == null) ? (
    <olInteractionDraw
      ref={drawRef}
      args={interactionDrawArguments}
      condition={(e) => {
        // 0 is the main mouse button. See: https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button
        // @ts-ignore
        return e.originalEvent.button === 0;
      }}
      onDrawabort={() => {
        setDrawingToolState(DrawingToolState.IDLE);
        return true;
      }}
      onDrawstart={() => {
        setDrawingToolState(DrawingToolState.DRAWING);
        return true;
      }}
      onDrawend={
        selectedTool === Tools.IOG
          ? performIOGFromDrawEvent
          : createLabelFromDrawEvent
      }
    />
  ) : (
    <>
      <olInteractionPointer
        args={{ handleDownEvent: createPointInsideOrOutside }}
      />

      <olLayerVector>
        <olSourceVector>
          {[
            ...pointsInside.map((coordinates) => {
              return (
                <olFeature
                  key={coordinates.join("-")}
                  geometry={new Point(coordinates)}
                  style={
                    new Style({
                      image: new CircleStyle({
                        radius: 8,
                        fill: new Fill({
                          color: "#23e623ff",
                        }),
                        stroke: new Stroke({
                          color: "#ffffffff",
                          width: 2,
                        }),
                      }),
                    })
                  }
                />
              );
            }),
            ...pointsOutside.map((coordinates) => {
              return (
                <olFeature
                  key={coordinates.join("-")}
                  geometry={new Point(coordinates)}
                  style={
                    new Style({
                      image: new CircleStyle({
                        radius: 8,
                        fill: new Fill({
                          color: "#ff2323ff",
                        }),
                        stroke: new Stroke({
                          color: "#ffffffff",
                          width: 2,
                        }),
                      }),
                    })
                  }
                />
              );
            }),
          ]}
        </olSourceVector>
      </olLayerVector>
    </>
  );
};