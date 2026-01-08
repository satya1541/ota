import { Loader } from "@/components/loader";

function Spinner({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div {...props}>
      <Loader className={className} />
    </div>
  );
}

export { Spinner }
