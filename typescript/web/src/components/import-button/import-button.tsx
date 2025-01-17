import {
  Button,
  IconButton,
  ButtonProps,
  chakra,
  Tooltip,
  useBreakpointValue,
} from "@chakra-ui/react";
import { useQueryParam } from "use-query-params";

import { RiUploadCloud2Line } from "react-icons/ri";
import { BoolParam } from "../../utils/query-param-bool";
import { ImportImagesModal } from "./import-images-modal";

const UploadIcon = chakra(RiUploadCloud2Line);

type Props = ButtonProps & {
  showModal?: boolean;
};

export const ImportButton = ({ showModal = true, ...props }: Props) => {
  const [isOpen, setIsOpen] = useQueryParam("modal-import", BoolParam);

  const largeButton = (
    <Button
      aria-label="Add images"
      leftIcon={<UploadIcon fontSize="xl" />}
      onClick={() => setIsOpen(true, "replaceIn")}
      variant="ghost"
      {...props}
    >
      Add images
    </Button>
  );

  const smallButton = (
    <Tooltip label="Add images" openDelay={300}>
      <IconButton
        aria-label="Add images"
        icon={<UploadIcon fontSize="xl" />}
        onClick={() => setIsOpen(true, "replaceIn")}
        variant="ghost"
        {...props}
      />
    </Tooltip>
  );

  const button =
    useBreakpointValue({ base: smallButton, lg: largeButton }) ?? largeButton;

  return (
    <>
      {showModal && (
        <ImportImagesModal
          isOpen={isOpen ?? false}
          onClose={() => setIsOpen(false, "replaceIn")}
        />
      )}
      {button}
    </>
  );
};
