"use client";

import { useState, useRef } from "react";
import { X, Upload, Loader2 } from "lucide-react";
import {
    createCarouselImage,
    updateCarouselImage,
    uploadCarouselImage,
    type CarouselImage,
    type CarouselImageCreate,
    type CarouselImageUpdate,
} from "@/lib/api/admin/carousel";

interface CarouselImageModalProps {
    image?: CarouselImage | null;
    existingImages?: CarouselImage[];
    onClose: () => void;
    onSuccess: () => void;
}

export function CarouselImageModal({
    image,
    existingImages = [],
    onClose,
    onSuccess,
}: CarouselImageModalProps) {
    const [title, setTitle] = useState(image?.title || "");
    const [subtitle, setSubtitle] = useState(image?.subtitle || "");
    const [linkUrl, setLinkUrl] = useState(image?.link_url || "");

    // Auto-calculate next available display order
    const getNextDisplayOrder = () => {
        if (image) return image.display_order; // Keep existing order when editing
        if (existingImages.length === 0) return 1;
        const maxOrder = Math.max(...existingImages.map(img => img.display_order));
        return maxOrder + 1;
    };

    const [displayOrder, setDisplayOrder] = useState(
        getNextDisplayOrder().toString()
    );
    const [active, setActive] = useState(image?.active ?? true);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [orderWarning, setOrderWarning] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isEdit = !!image;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            setError("Please select a JPG, PNG, or WebP image");
            return;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError("Image size must be less than 5MB");
            return;
        }

        setSelectedFile(file);
        setError(null);

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleOrderChange = (value: string) => {
        const orderNum = parseInt(value);

        // Check if order is already taken by another image
        const existingWithOrder = existingImages.find(
            img => img.display_order === orderNum && img._id !== image?._id
        );

        if (existingWithOrder) {
            // Auto-increment to next available order
            const maxOrder = Math.max(...existingImages.map(img => img.display_order));
            const nextOrder = maxOrder + 1;
            setDisplayOrder(nextOrder.toString());
            setOrderWarning(
                `Order ${orderNum} is already used. Auto-incremented to ${nextOrder}.`
            );
            // Clear warning after 3 seconds
            setTimeout(() => setOrderWarning(null), 3000);
        } else {
            setDisplayOrder(value);
            setOrderWarning(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setUploading(true);

        try {
            if (isEdit && image) {
                // Update existing image
                const updateData: CarouselImageUpdate = {
                    title: title || undefined,
                    subtitle: subtitle || undefined,
                    link_url: linkUrl || undefined,
                    display_order: parseInt(displayOrder),
                    active,
                };
                await updateCarouselImage(image._id, updateData);

                // Upload new image if selected
                if (selectedFile) {
                    await uploadCarouselImage(image._id, selectedFile);
                }
            } else {
                // Create new image
                if (!selectedFile) {
                    setError("Please select an image to upload");
                    setUploading(false);
                    return;
                }

                const createData: CarouselImageCreate = {
                    title: title || undefined,
                    subtitle: subtitle || undefined,
                    link_url: linkUrl || undefined,
                    display_order: parseInt(displayOrder),
                    active,
                };

                // First create the carousel entry
                const newImage = await createCarouselImage(createData);

                // Then upload the image file using the returned ID
                if (!newImage._id) {
                    throw new Error("Failed to get carousel image ID from server response");
                }
                await uploadCarouselImage(newImage._id, selectedFile);
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Failed to save carousel image:", err);
            setError(err.response?.data?.detail || "Failed to save carousel image");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-2xl font-bold text-gray-900">
                        {isEdit ? "Edit Carousel Image" : "Add New Carousel Image"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Image Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Image {!isEdit && <span className="text-red-500">*</span>}
                        </label>
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-primary-500 transition-colors"
                        >
                            {previewUrl || (image?.image_url && !selectedFile) ? (
                                <div className="relative h-32 mb-2">
                                    <img
                                        src={
                                            previewUrl ||
                                            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${image?.image_url}`
                                        }
                                        alt="Preview"
                                        className="max-h-full mx-auto object-contain"
                                    />
                                </div>
                            ) : (
                                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                            )}
                            <p className="text-sm text-gray-600 mb-1">
                                Click to {isEdit ? "replace" : "upload"} image
                            </p>
                            <p className="text-xs text-gray-500">
                                JPG, PNG, or WebP • Max 5MB • Recommended: 1920x500px
                            </p>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </div>

                    {/* Title */}
                    <div>
                        <label
                            htmlFor="title"
                            className="block text-sm font-medium text-gray-700 mb-1"
                        >
                            Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="title"
                            type="text"
                            value={title}
                            required
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Season 2 Announcement"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>

                    {/* Subtitle */}
                    <div>
                        <label
                            htmlFor="subtitle"
                            className="block text-sm font-medium text-gray-700 mb-1"
                        >
                            Subtitle (Optional)
                        </label>
                        <input
                            id="subtitle"
                            type="text"
                            value={subtitle}
                            onChange={(e) => setSubtitle(e.target.value)}
                            placeholder="e.g., Join the biggest fantasy league"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>

                    {/* Link URL */}
                    <div>
                        <label
                            htmlFor="linkUrl"
                            className="block text-sm font-medium text-gray-700 mb-1"
                        >
                            Link URL (Optional)
                        </label>
                        <input
                            id="linkUrl"
                            type="url"
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            placeholder="https://example.com"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Clicking the carousel image will navigate to this URL
                        </p>
                    </div>

                    {/* Display Order */}
                    <div>
                        <label
                            htmlFor="displayOrder"
                            className="block text-sm font-medium text-gray-700 mb-1"
                        >
                            Display Order <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="displayOrder"
                            type="number"
                            min="1"
                            value={displayOrder}
                            onChange={(e) => handleOrderChange(e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Lower numbers appear first in the carousel
                        </p>
                        {orderWarning && (
                            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                ✓ {orderWarning}
                            </p>
                        )}
                    </div>

                    {/* Active Status */}
                    <div className="flex items-center gap-3">
                        <input
                            id="active"
                            type="checkbox"
                            checked={active}
                            onChange={(e) => setActive(e.target.checked)}
                            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <label htmlFor="active" className="text-sm font-medium text-gray-700">
                            Active (show in carousel)
                        </label>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={uploading}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={uploading}
                            className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {uploading ? "Saving..." : isEdit ? "Update" : "Create"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
