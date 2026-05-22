import 'package:flutter/material.dart';

/// Shimmer loading effect for skeleton screens
class SkeletonLoader extends StatefulWidget {
  final double width;
  final double height;
  final BorderRadius? borderRadius;
  final Color? baseColor;
  final Color? highlightColor;

  const SkeletonLoader({
    super.key,
    required this.width,
    required this.height,
    this.borderRadius,
    this.baseColor,
    this.highlightColor,
  });

  @override
  State<SkeletonLoader> createState() => _SkeletonLoaderState();
}

class _SkeletonLoaderState extends State<SkeletonLoader>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    )..repeat(reverse: true);
    
    _animation = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(
        parent: _controller,
        curve: Curves.easeInOut,
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final baseColor = widget.baseColor ?? const Color(0xFFE5E7EB);
    final highlightColor = widget.highlightColor ?? const Color(0xFFF3F4F6);
    final borderRadius = widget.borderRadius ?? BorderRadius.circular(8);

    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            borderRadius: borderRadius,
            gradient: LinearGradient(
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
              colors: [
                baseColor,
                highlightColor,
                baseColor,
              ],
              stops: [
                0.0,
                _animation.value,
                1.0,
              ],
            ),
          ),
        );
      },
    );
  }
}

/// Skeleton card for list items
class SkeletonCard extends StatelessWidget {
  final double height;

  const SkeletonCard({
    super.key,
    this.height = 80,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SkeletonLoader(
            width: 48,
            height: 48,
            borderRadius: BorderRadius.circular(12),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SkeletonLoader(
                  width: double.infinity,
                  height: 16,
                  borderRadius: BorderRadius.circular(4),
                ),
                const SizedBox(height: 8),
                SkeletonLoader(
                  width: 120,
                  height: 14,
                  borderRadius: BorderRadius.circular(4),
                ),
                const SizedBox(height: 8),
                SkeletonLoader(
                  width: 80,
                  height: 12,
                  borderRadius: BorderRadius.circular(4),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Skeleton list with multiple items
class SkeletonList extends StatelessWidget {
  final int itemCount;
  final double itemHeight;

  const SkeletonList({
    super.key,
    this.itemCount = 5,
    this.itemHeight = 80,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: List.generate(
        itemCount,
        (index) => SkeletonCard(height: itemHeight),
      ),
    );
  }
}

/// Skeleton for the earnings tab (header card + summary + transactions)
class EarningsSkeleton extends StatelessWidget {
  const EarningsSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
      physics: const NeverScrollableScrollPhysics(),
      children: [
        // Goal card
        SkeletonLoader(width: double.infinity, height: 90, borderRadius: BorderRadius.circular(16)),
        const SizedBox(height: 16),
        // Summary card
        SkeletonLoader(width: double.infinity, height: 120, borderRadius: BorderRadius.circular(16)),
        const SizedBox(height: 20),
        // Section label
        SkeletonLoader(width: 140, height: 16, borderRadius: BorderRadius.circular(4)),
        const SizedBox(height: 12),
        // Transaction rows
        ...List.generate(4, (_) => Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: SkeletonLoader(width: double.infinity, height: 68, borderRadius: BorderRadius.circular(14)),
        )),
      ],
    );
  }
}

/// Skeleton for a jobs list (upcoming / completed tabs)
class JobListSkeleton extends StatelessWidget {
  final int itemCount;
  const JobListSkeleton({super.key, this.itemCount = 4});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      physics: const NeverScrollableScrollPhysics(),
      children: List.generate(itemCount, (_) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: SkeletonLoader(width: double.infinity, height: 88, borderRadius: BorderRadius.circular(14)),
      )),
    );
  }
}

/// Skeleton for payout history list
class PayoutHistorySkeleton extends StatelessWidget {
  final int itemCount;
  const PayoutHistorySkeleton({super.key, this.itemCount = 4});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      physics: const NeverScrollableScrollPhysics(),
      children: List.generate(itemCount, (_) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SkeletonLoader(width: 120, height: 16, borderRadius: BorderRadius.circular(4)),
                  const SizedBox(height: 6),
                  SkeletonLoader(width: 180, height: 13, borderRadius: BorderRadius.circular(4)),
                ],
              ),
            ),
            SkeletonLoader(width: 70, height: 26, borderRadius: BorderRadius.circular(20)),
          ],
        ),
      )),
    );
  }
}

/// Dashboard skeleton for home screen
class DashboardSkeleton extends StatelessWidget {
  const DashboardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header skeleton
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SkeletonLoader(
                      width: 150,
                      height: 24,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    const SizedBox(height: 8),
                    SkeletonLoader(
                      width: 120,
                      height: 16,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ],
                ),
              ),
              const SkeletonLoader(
                width: 42,
                height: 42,
                borderRadius: BorderRadius.all(Radius.circular(21)),
              ),
            ],
          ),
          const SizedBox(height: 20),
          // CTA card skeleton
          SkeletonLoader(
            width: double.infinity,
            height: 100,
            borderRadius: BorderRadius.circular(18),
          ),
          const SizedBox(height: 16),
          // Info card skeleton
          SkeletonLoader(
            width: double.infinity,
            height: 80,
            borderRadius: BorderRadius.circular(18),
          ),
          const SizedBox(height: 16),
          // Pickup card skeleton
          SkeletonLoader(
            width: double.infinity,
            height: 120,
            borderRadius: BorderRadius.circular(18),
          ),
          const SizedBox(height: 22),
          // Quick actions skeleton
          SkeletonLoader(
            width: 100,
            height: 20,
            borderRadius: BorderRadius.circular(4),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: SkeletonLoader(
                  height: 80,
                  width: double.infinity,
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: SkeletonLoader(
                  height: 80,
                  width: double.infinity,
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: SkeletonLoader(
                  height: 80,
                  width: double.infinity,
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
