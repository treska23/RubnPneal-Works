import Image from 'next/image';
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
  CardAction,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export interface FeaturedItem {
  id: string | number;
  imageSrc: string;
  title: string;
  description: string;
  link?: string;
}

interface FeaturedGridProps {
  items?: FeaturedItem[];
}

/**
 * FeaturedGrid
 *
 * Muestra un grid de tarjetas destacadas con imagen, título, descripción y acción.
 * Usa el componente Card con slots personalizados para flexibilidad.
 *
 * Props:
 * - items: Array<FeaturedItem>
 */
export default function FeaturedGrid({ items = [] }: FeaturedGridProps) {
  if (items.length === 0) {
    return <p className="p-4 text-center text-muted-foreground">No hay elementos destacados.</p>;
  }

  return (
    <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-4">
      {items.map((item) => (
        <Card key={item.id} className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="p-0">
            <div className="relative h-48 w-full">
              <Image
                src={item.imageSrc}
                alt={item.title}
                fill
                style={{ objectFit: 'cover' }}
                className="rounded-t-xl"
                unoptimized
              />
            </div>
          </CardHeader>

          <CardContent>
            <CardTitle>{item.title}</CardTitle>
            <CardDescription className="line-clamp-3 mt-1">{item.description}</CardDescription>
          </CardContent>

          {item.link && (
            <CardFooter>
              <CardAction>
                <Button variant="link">
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="no-underline"
                  >
                    Leer más →
                  </a>
                </Button>
              </CardAction>
            </CardFooter>
          )}
        </Card>
      ))}
    </div>
  );
}

// Ejemplo de uso:
// const featuredItems: FeaturedItem[] = [
//   { id: 1, imageSrc: '/posts/post1.jpg', title: 'Título 1', description: 'Desc breve...', link: '/posts/1' },
//   ...
// ];
// <FeaturedGrid items={featuredItems} />
