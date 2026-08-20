from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.db.models import Count, Q, ProtectedError
from .models import Society, Block, Flat
from .forms import SocietyForm, BlockForm, FlatForm


# ====================================================
# SOCIETY CRUD
# ====================================================

@login_required
def society_list(request):
    query = request.GET.get('q', '').strip()
    societies = Society.objects.annotate(
        block_count=Count('blocks', distinct=True),
        resident_count=Count('residents', distinct=True)
    ).order_by('-id')

    if query:
        societies = societies.filter(
            Q(name__icontains=query) |
            Q(address__icontains=query) |
            Q(city__icontains=query) |
            Q(pincode__icontains=query)
        )

    return render(request, 'societies/society_list.html', {
        'societies': societies,
        'query': query
    })


@login_required
def society_add(request):
    if request.method == "POST":
        form = SocietyForm(request.POST)
        if form.is_valid():
            soc = form.save()
            messages.success(request, f"Society '{soc.name}' added successfully.")
            return redirect('society_list')
        else:
            messages.error(request, "Please correct the form errors below.")
    else:
        form = SocietyForm()

    return render(request, 'societies/society_add.html', {
        'form': form
    })


@login_required
def society_edit(request, pk):
    society = get_object_or_404(Society, id=pk)

    if request.method == "POST":
        form = SocietyForm(request.POST, instance=society)
        if form.is_valid():
            form.save()
            messages.success(request, f"Society '{society.name}' updated successfully.")
            return redirect('society_list')
        else:
            messages.error(request, "Please correct the form errors below.")
    else:
        form = SocietyForm(instance=society)

    return render(request, 'societies/society_edit.html', {
        'form': form,
        'society': society
    })


@login_required
def society_delete(request, pk):
    society = get_object_or_404(Society, id=pk)

    if request.method == "POST":
        block_cnt = society.blocks.count()
        res_cnt = society.residents.count()
        if block_cnt > 0 or res_cnt > 0:
            messages.error(request, f"Cannot delete society '{society.name}' because it contains {block_cnt} block(s) and {res_cnt} resident(s). Please remove linked items first.")
            return redirect('society_list')

        try:
            name = society.name
            society.delete()
            messages.success(request, f"Society '{name}' deleted successfully.")
            return redirect('society_list')
        except ProtectedError:
            messages.error(request, f"Cannot delete society '{society.name}' due to foreign key restrictions.")
            return redirect('society_list')

    return render(request, 'societies/society_delete.html', {
        'society': society
    })


# ====================================================
# BLOCK CRUD
# ====================================================

@login_required
def block_list(request):
    query = request.GET.get('q', '').strip()
    blocks = Block.objects.select_related('society').annotate(
        flat_count=Count('flats', distinct=True),
        resident_count=Count('residents', distinct=True)
    ).order_by('-id')

    if query:
        blocks = blocks.filter(
            Q(block_name__icontains=query) |
            Q(society__name__icontains=query)
        )

    return render(request, 'societies/block_list.html', {
        'blocks': blocks,
        'query': query
    })


@login_required
def block_add(request):
    if request.method == "POST":
        form = BlockForm(request.POST)
        if form.is_valid():
            blk = form.save()
            messages.success(request, f"Block '{blk.block_name}' added to {blk.society.name} successfully.")
            return redirect('block_list')
        else:
            messages.error(request, "Please correct the form errors below.")
    else:
        form = BlockForm()

    return render(request, 'societies/block_add.html', {
        'form': form
    })


@login_required
def block_edit(request, pk):
    block = get_object_or_404(Block, id=pk)

    if request.method == "POST":
        form = BlockForm(request.POST, instance=block)
        if form.is_valid():
            form.save()
            messages.success(request, f"Block '{block.block_name}' updated successfully.")
            return redirect('block_list')
        else:
            messages.error(request, "Please correct the form errors below.")
    else:
        form = BlockForm(instance=block)

    return render(request, 'societies/block_edit.html', {
        'form': form,
        'block': block
    })


@login_required
def block_delete(request, pk):
    block = get_object_or_404(Block, id=pk)

    if request.method == "POST":
        flat_cnt = block.flats.count()
        res_cnt = block.residents.count()
        if flat_cnt > 0 or res_cnt > 0:
            messages.error(request, f"Cannot delete block '{block.block_name}' because it contains {flat_cnt} flat(s) and {res_cnt} resident(s). Remove linked items first.")
            return redirect('block_list')

        try:
            name = block.block_name
            block.delete()
            messages.success(request, f"Block '{name}' deleted successfully.")
            return redirect('block_list')
        except ProtectedError:
            messages.error(request, f"Cannot delete block '{block.block_name}' due to foreign key constraints.")
            return redirect('block_list')

    return render(request, 'societies/block_delete.html', {
        'block': block
    })


# ====================================================
# FLAT CRUD
# ====================================================

@login_required
def flat_list(request):
    query = request.GET.get('q', '').strip()
    flats = Flat.objects.select_related('block__society').prefetch_related('residents').order_by('-id')

    if query:
        flats = flats.filter(
            Q(flat_number__icontains=query) |
            Q(block__block_name__icontains=query) |
            Q(block__society__name__icontains=query)
        )

    return render(request, 'societies/flat_list.html', {
        'flats': flats,
        'query': query
    })


@login_required
def flat_add(request):
    if request.method == "POST":
        form = FlatForm(request.POST)
        if form.is_valid():
            flat = form.save()
            messages.success(request, f"Flat '{flat.flat_number}' added successfully.")
            return redirect('flat_list')
        else:
            messages.error(request, "Please correct the form errors below.")
    else:
        form = FlatForm()

    return render(request, 'societies/flat_add.html', {
        'form': form
    })


@login_required
def flat_edit(request, pk):
    flat = get_object_or_404(Flat, id=pk)

    if request.method == "POST":
        form = FlatForm(request.POST, instance=flat)
        if form.is_valid():
            form.save()
            messages.success(request, f"Flat '{flat.flat_number}' updated successfully.")
            return redirect('flat_list')
        else:
            messages.error(request, "Please correct the form errors below.")
    else:
        form = FlatForm(instance=flat)

    return render(request, 'societies/flat_edit.html', {
        'form': form,
        'flat': flat
    })


@login_required
def flat_delete(request, pk):
    flat = get_object_or_404(Flat, id=pk)

    if request.method == "POST":
        num = flat.flat_number
        flat.delete()
        messages.success(request, f"Flat '{num}' deleted successfully.")
        return redirect('flat_list')

    return render(request, 'societies/flat_delete.html', {
        'flat': flat
    })


@login_required
def get_society_blocks_api(request, society_id):
    blocks = Block.objects.filter(society_id=society_id).values('id', 'block_name')
    return JsonResponse({'blocks': list(blocks)})


