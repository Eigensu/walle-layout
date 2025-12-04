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

export interface CarouselImageCreate {
    title?: string;
    subtitle?: string;
    link_url?: string;
    display_order: number;
    active?: boolean;
}

export interface CarouselImageUpdate {
    title?: string;
    subtitle?: string;
    link_url?: string;
    display_order?: number;
    active?: boolean;
}

export interface ReorderRequest {
    carousel_ids: string[];
}

/**
 * Get all carousel images (admin - includes inactive)
 */
export async function getAllCarouselImages(
    page: number = 1,
    pageSize: number = 100
): Promise<CarouselImagesListResponse> {
    const response = await apiClient.get<CarouselImagesListResponse>(
        "/api/v1/carousel/",
        {
            params: {
                active: null, // null to get both active and inactive
                page,
                page_size: pageSize,
            },
        }
    );
    return response.data;
}

/**
 * Get single carousel image by ID
 */
export async function getCarouselImageById(id: string): Promise<CarouselImage> {
    const response = await apiClient.get<CarouselImage>(`/api/v1/carousel/${id}`);
    return response.data;
}

/**
 * Create new carousel image entry
 */
export async function createCarouselImage(
    data: CarouselImageCreate
): Promise<CarouselImage> {
    const response = await apiClient.post<CarouselImage>("/api/v1/carousel/", data);
    return response.data;
}

/**
 * Update carousel image metadata
 */
export async function updateCarouselImage(
    id: string,
    data: CarouselImageUpdate
): Promise<CarouselImage> {
    const response = await apiClient.put<CarouselImage>(
        `/api/v1/carousel/${id}`,
        data
    );
    return response.data;
}

/**
 * Delete carousel image
 */
export async function deleteCarouselImage(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/carousel/${id}`);
}

/**
 * Upload image file for carousel
 */
export async function uploadCarouselImage(
    id: string,
    file: File
): Promise<{ image_url: string }> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.post<{ image_url: string }>(
        `/api/v1/carousel/${id}/upload-image`,
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        }
    );
    return response.data;
}

/**
 * Toggle active status
 */
export async function toggleCarouselActive(id: string): Promise<CarouselImage> {
    const response = await apiClient.patch<CarouselImage>(
        `/api/v1/carousel/${id}/toggle-active`
    );
    return response.data;
}

/**
 * Reorder carousel images
 */
export async function reorderCarouselImages(
    carouselIds: string[]
): Promise<void> {
    await apiClient.patch("/api/v1/carousel/reorder", {
        carousel_ids: carouselIds,
    });
}
