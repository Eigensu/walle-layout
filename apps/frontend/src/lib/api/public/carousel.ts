import apiClient from "../client";

export interface CarouselImage {
    _id: string;
    title?: string;
    subtitle?: string;
    image_url?: string;
    link_url?: string;
    display_order: number;
    active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CarouselImagesListResponse {
    images: CarouselImage[];
    total: number;
    page: number;
    page_size: number;
}

/**
 * Get active carousel images for public display
 */
export async function getActiveCarouselImages(): Promise<CarouselImage[]> {
    try {
        const response = await apiClient.get<CarouselImagesListResponse>(
            "/api/v1/carousel/",
            {
                params: {
                    active: true,
                    page: 1,
                    page_size: 100,
                },
            }
        );
        return response.data.images;
    } catch (error) {
        console.error("Failed to fetch carousel images:", error);
        return [];
    }
}
