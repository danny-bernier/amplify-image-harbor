import Image from 'next/image';

export default function Gallery() {
  // Create an array of 50 placeholder images
  const images = Array.from({ length: 50 }, (_, index) => ({
    id: index + 1,
    src: '/globe.svg',
    alt: `Image ${index + 1}`,
    title: `Sample Image ${index + 1}`
  }));

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Image Gallery</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {images.map((image) => (
          <div 
            key={image.id} 
            className="bg-gray-100 border border-gray-200 rounded-lg p-2 hover:shadow-lg transition-shadow"
          >
            <Image
              src={image.src}
              alt={image.alt}
              width={100}
              height={100}
              className="w-full h-24 object-contain"
            />
            <p className="text-sm text-gray-600 mt-2 text-center">
              {image.title}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}