from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query, Response
from typing import Optional
from datetime import datetime

from app.models.sponsor import Sponsor, SponsorTier
from app.models.user import User
from app.schemas.sponsor import (
    SponsorCreate,
    SponsorUpdate,
    SponsorResponse,
    SponsorsListResponse,
    SponsorDetailResponse,
    UploadResponse
)
from app.utils.dependencies import get_current_active_user
from app.utils.gridfs import (
    upload_sponsor_logo_to_gridfs,
    open_sponsor_logo_stream,
    delete_sponsor_logo_from_gridfs,
)

router = APIRouter(prefix="/api/v1/sponsors", tags=["sponsors"])


def sponsor_to_response(sponsor: Sponsor) -> dict:
    """Convert Sponsor document to response dict"""
    sponsor_dict = sponsor.model_dump()
    sponsor_dict["_id"] = str(sponsor.id)
    return sponsor_dict


# Public endpoints (no authentication required)

@router.get("/", response_model=SponsorsListResponse)
async def get_sponsors(
    tier: Optional[str] = Query(None, description="Filter by tier (platinum, gold, silver, bronze)"),
    featured: Optional[bool] = Query(None, description="Filter by featured status"),
    active: Optional[bool] = Query(True, description="Filter by active status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(100, ge=1, le=100, description="Items per page")
):
    """
    Get all sponsors with optional filters
    
    - **tier**: Filter by sponsor tier (platinum, gold, silver, bronze)
    - **featured**: Filter by featured status (true/false)
    - **active**: Filter by active status (default: true)
    - **page**: Page number for pagination
    - **page_size**: Number of items per page (max 100)
    """
    # Build query
    query = {}
    
    if tier:
        try:
            query["tier"] = SponsorTier(tier.lower())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid tier. Must be one of: platinum, gold, silver, bronze"
            )
    
    if featured is not None:
        query["featured"] = featured
    
    if active is not None:
        query["active"] = active
    
    # Get total count
    total = await Sponsor.find(query).count()
    
    # Get sponsors with pagination, sorted by display_order and created_at
    sponsors = await Sponsor.find(query)\
        .sort("+display_order", "-created_at")\
        .skip((page - 1) * page_size)\
        .limit(page_size)\
        .to_list()
    
    return SponsorsListResponse(
        sponsors=[SponsorResponse(**sponsor_to_response(s)) for s in sponsors],
        total=total,
        page=page,
        page_size=page_size
    )


# Accept collection GET without trailing slash to prevent 405 when clients omit the slash
@router.get("", response_model=SponsorsListResponse)
async def get_sponsors_no_slash(
    tier: Optional[str] = Query(None, description="Filter by tier (platinum, gold, silver, bronze)"),
    featured: Optional[bool] = Query(None, description="Filter by featured status"),
    active: Optional[bool] = Query(True, description="Filter by active status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(100, ge=1, le=100, description="Items per page")
):
    return await get_sponsors(tier=tier, featured=featured, active=active, page=page, page_size=page_size)


@router.get("/{sponsor_id}", response_model=SponsorDetailResponse)
async def get_sponsor(sponsor_id: str):
    """
    Get a single sponsor by ID
    
    - **sponsor_id**: The ID of the sponsor to retrieve
    """
    sponsor = await Sponsor.get(sponsor_id)
    
    if not sponsor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sponsor not found"
        )
    
    return SponsorDetailResponse(
        sponsor=SponsorResponse(**sponsor_to_response(sponsor))
    )


# Accept collection POST without trailing slash to prevent 307 redirects that can drop headers in some clients
@router.post("", response_model=SponsorDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_sponsor_no_slash(
    sponsor_data: SponsorCreate,
    current_user: User = Depends(get_current_active_user)
):
    return await create_sponsor(sponsor_data, current_user)


# Admin endpoints (authentication required)

@router.post("/", response_model=SponsorDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_sponsor(
    sponsor_data: SponsorCreate,
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new sponsor (Admin only)
    
    Requires authentication. Creates a new sponsor with the provided data.
    """
    # Check if sponsor with same name already exists
    existing_sponsor = await Sponsor.find_one(Sponsor.name == sponsor_data.name)
    if existing_sponsor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Sponsor with name '{sponsor_data.name}' already exists"
        )
    
    # Create new sponsor
    sponsor = Sponsor(**sponsor_data.model_dump())
    await sponsor.insert()
    
    return SponsorDetailResponse(
        sponsor=SponsorResponse(**sponsor_to_response(sponsor))
    )


@router.put("/{sponsor_id}", response_model=SponsorDetailResponse)
async def update_sponsor(
    sponsor_id: str,
    sponsor_data: SponsorUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """
    Update sponsor information (Admin only)
    
    Requires authentication. Updates the specified sponsor with the provided data.
    Only fields that are provided will be updated.
    """
    sponsor = await Sponsor.get(sponsor_id)
    
    if not sponsor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sponsor not found"
        )
    
    # Check if new name conflicts with existing sponsor
    if sponsor_data.name and sponsor_data.name != sponsor.name:
        existing_sponsor = await Sponsor.find_one(Sponsor.name == sponsor_data.name)
        if existing_sponsor:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Sponsor with name '{sponsor_data.name}' already exists"
            )
    
    # Update fields
    update_data = sponsor_data.model_dump(exclude_unset=True)
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        for field, value in update_data.items():
            setattr(sponsor, field, value)
        await sponsor.save()
    
    return SponsorDetailResponse(
        sponsor=SponsorResponse(**sponsor_to_response(sponsor))
    )


@router.delete("/{sponsor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sponsor(
    sponsor_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a sponsor (Admin only)
    
    Requires authentication. Permanently deletes the specified sponsor.
    Also attempts to delete the associated logo file.
    """
    sponsor = await Sponsor.get(sponsor_id)
    
    if not sponsor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sponsor not found"
        )
    
    # Try to delete logo from GridFS if it exists
    if sponsor.logo_file_id:
        await delete_sponsor_logo_from_gridfs(sponsor.logo_file_id)
    
    await sponsor.delete()
    return None


@router.post("/{sponsor_id}/upload-logo", response_model=UploadResponse)
async def upload_sponsor_logo(
    sponsor_id: str,
    file: UploadFile = File(..., description="Sponsor logo image"),
    current_user: User = Depends(get_current_active_user)
):
    """
    Upload sponsor logo image (Admin only)
    
    Requires authentication. Uploads a logo image for the specified sponsor.
    
    - **Allowed formats**: JPG, JPEG, PNG, SVG, WebP
    - **Maximum size**: 5MB
    - **Recommended size**: 400x400px or larger
    """
    sponsor = await Sponsor.get(sponsor_id)
    
    if not sponsor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sponsor not found"
        )
    
    # Delete old logo if it exists in GridFS
    if sponsor.logo_file_id:
        await delete_sponsor_logo_from_gridfs(sponsor.logo_file_id)
    
    # Save new logo to GridFS
    try:
        file_id = await upload_sponsor_logo_to_gridfs(file, filename_prefix=f"sponsor_{sponsor_id}")
        # Update sponsor with API URL and file id
        sponsor.logo_file_id = file_id
        sponsor.logo = f"/api/v1/sponsors/{sponsor_id}/logo"
        sponsor.updated_at = datetime.utcnow()
        await sponsor.save()
        return UploadResponse(
            url=sponsor.logo,
            message="Logo uploaded successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload logo: {str(e)}"
        )


@router.get("/{sponsor_id}/logo")
async def get_sponsor_logo(sponsor_id: str):
    sponsor = await Sponsor.get(sponsor_id)
    if not sponsor or not sponsor.logo_file_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Logo not found")
    stream, content_type = await open_sponsor_logo_stream(sponsor.logo_file_id)
    data = await stream.read()
    return Response(content=data, media_type=content_type)


# Additional utility endpoints

@router.patch("/{sponsor_id}/toggle-featured", response_model=SponsorDetailResponse)
async def toggle_featured(
    sponsor_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Toggle sponsor featured status (Admin only)
    
    Requires authentication. Toggles the featured status of the specified sponsor.
    """
    sponsor = await Sponsor.get(sponsor_id)
    
    if not sponsor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sponsor not found"
        )
    
    sponsor.featured = not sponsor.featured
    sponsor.updated_at = datetime.utcnow()
    await sponsor.save()
    
    return SponsorDetailResponse(
        sponsor=SponsorResponse(**sponsor_to_response(sponsor))
    )


@router.patch("/{sponsor_id}/toggle-active", response_model=SponsorDetailResponse)
async def toggle_active(
    sponsor_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Toggle sponsor active status (Admin only)
    
    Requires authentication. Toggles the active status of the specified sponsor.
    Inactive sponsors can be hidden from public view.
    """
    sponsor = await Sponsor.get(sponsor_id)
    
    if not sponsor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sponsor not found"
        )
    
    sponsor.active = not sponsor.active
    sponsor.updated_at = datetime.utcnow()
    await sponsor.save()
    
    return SponsorDetailResponse(
        sponsor=SponsorResponse(**sponsor_to_response(sponsor))
    )
