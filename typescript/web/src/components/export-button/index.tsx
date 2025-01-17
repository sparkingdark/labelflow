import {
  Button,
  ButtonProps,
  Tooltip,
  IconButton,
  chakra,
  useBreakpointValue,
} from "@chakra-ui/react";
import { useQueryParam } from "use-query-params";
import { RiDownloadCloud2Line } from "react-icons/ri";
import { trackEvent } from "../../utils/google-analytics";
import { BoolParam } from "../../utils/query-param-bool";
import { ExportModal } from "./modal";

const DownloadIcon = chakra(RiDownloadCloud2Line);

type Props = ButtonProps;

export const ExportButton = ({ ...props }: Props) => {
  const [isOpen, setIsOpen] = useQueryParam("modal-export", BoolParam);

  const largeButton = (
    <Button
      aria-label="Export"
      leftIcon={<DownloadIcon fontSize="xl" />}
      onClick={() => {
        trackEvent("export_button_click", {});
        setIsOpen(true, "replaceIn");
      }}
      variant="ghost"
      {...props}
    >
      Export
    </Button>
  );

  const smallButton = (
    <Tooltip label="Export" openDelay={300}>
      <IconButton
        aria-label="Export"
        icon={<DownloadIcon fontSize="xl" />}
        onClick={() => {
          trackEvent("export_button_click", {});
          setIsOpen(true, "replaceIn");
        }}
        variant="ghost"
        {...props}
      />
    </Tooltip>
  );

  const button = useBreakpointValue({
    base: null,
    md: smallButton,
    lg: largeButton,
  });

  return (
    <>
      <ExportModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false, "replaceIn")}
      />
      {button}
    </>
  );
};
