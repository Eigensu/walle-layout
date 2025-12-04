"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import {
    getAllCarouselImages,
    toggleCarouselActive,
    deleteCarouselImage,
    type CarouselImage,
} from "@/lib/api/admin/carousel";
import { CarouselImageModal } from "../CarouselImageModal";
import Image from "next/image";

export function CarouselSection() {
    const [carouselImages, setCarouselImages] = useState<CarouselImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingImage, setEditingImage] = useState<CarouselImage | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    // Load carousel images
    useEffect(() => {
        loadCarouselImages();
    }, []);

    const loadCarouselImages = async () => {
        try {
            setLoading(true);
            const response = await getAllCarouselImages();
            setCarouselImages(response.images);
        } catch (error) {
            console.error("Failed to load carousel images:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (id: string) => {
        try {
            await toggleCarouselActive(id);
            await loadCarouselImages();
        } catch (error) {
            console.error("Failed to toggle active status:", error);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteCarouselImage(id);
            setDeleteConfirm(null);
            await loadCarouselImages();
        } catch (error) {
            console.error("Failed to delete carousel image:", error);
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        Carousel Management
                    </h2>
                    <p className="text-gray-600 mt-1">
                        Manage hero carousel images for the home page
                    </p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Add New Image
                </button>
            </div>

            {/* Carousel Images Grid */}
            {loading ? (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            ) : carouselImages.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <p className="text-gray-500 text-lg">
                        No carousel images yet. Add your first image to get started!
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {carouselImages.map((image) => (
                        <div
                            key={image._id}
                            className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow"
                        >
                            {/* Image Preview */}
                            <div className="relative h-40 bg-gray-100">
                                {image.image_url ? (
                                    <Image
                                        src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${image.image_url}`}
                                        alt={image.title || "Carousel image"}
                                        fill
                                        className="object-contain"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                                        No image uploaded
                                    </div>
                                )}
                                {/* Status Badge */}
                                <div className="absolute top-2 right-2">
                                    <span
                                        className={`px-2 py-1 rounded-full text-xs font-semibold ${image.active
                                            ? "bg-green-100 text-green-800"
                                            : "bg-gray-100 text-gray-600"
                                            }`}
                                    >
                                        {image.active ? "Active" : "Inactive"}
                                    </span>
                                </div>
                                {/* Display Order */}
                                <div className="absolute top-2 left-2">
                                    <span className="bg-primary-600 text-white px-2 py-1 rounded text-xs font-semibold">
                                        #{image.display_order}
                                    </span>
                                </div>
                            </div>

                            {/* Card Content */}
                            <div className="p-3">
                                <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">
                                    {image.title || "Untitled"}
                                </h3>
                                {image.subtitle && (
                                    <p className="text-xs text-gray-600 mb-2 truncate">
                                        {image.subtitle}
                                    </p>
                                )}
                                {image.link_url && (
                                    <a
                                        href={image.link_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-primary-600 hover:underline block mb-2 truncate"
                                    >
                                        {image.link_url}
                                    </a>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-2 mt-3">
                                    <button
                                        onClick={() => handleToggleActive(image._id)}
                                        className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${image.active
                                            ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
                                            : "bg-green-100 hover:bg-green-200 text-green-700"
                                            }`}
                                        title={image.active ? "Deactivate" : "Activate"}
                                    >
                                        {image.active ? (
                                            <EyeOff className="w-3 h-3" />
                                        ) : (
                                            <Eye className="w-3 h-3" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setEditingImage(image)}
                                        className="flex-1 flex items-center justify-center gap-1 bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1.5 rounded text-xs font-medium transition-colors"
                                        title="Edit"
                                    >
                                        <Edit className="w-3 h-3" />
                                    </button>
                                    <button
                                        onClick={() => setDeleteConfirm(image._id)}
                                        className="flex-1 flex items-center justify-center gap-1 bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1.5 rounded text-xs font-medium transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">
                            Confirm Deletion
                        </h3>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to delete this carousel image? This
                            action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            {(showAddModal || editingImage) && (
                <CarouselImageModal
                    image={editingImage}
                    existingImages={carouselImages}
                    onClose={() => {
                        setShowAddModal(false);
                        setEditingImage(null);
                    }}
                    onSuccess={() => {
                        loadCarouselImages();
                    }}
                />
            )}
        </div>
    );
}
