import AccesManager from "@/components/admin/AccesManager";

export default function AccesPage({ params }: { params: { id: string } }) {
  return <AccesManager rencontreId={Number(params.id)} />;
}
