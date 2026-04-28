class Proof {
  final String imageUrl;

  Proof({required this.imageUrl});

  factory Proof.fromJson(Map<String, dynamic> json) {
    return Proof(
      imageUrl: json['imageUrl'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'imageUrl': imageUrl,
    };
  }
}
