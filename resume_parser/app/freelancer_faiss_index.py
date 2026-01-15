import os
import json
import numpy as np
import faiss

BASE_FOLDER = "embedding_vectors_fl"

def build_faiss_index(base_folder=BASE_FOLDER):
    embeddings = []
    metadata_list = []

    for freelancer_id in os.listdir(base_folder):
        folder = os.path.join(base_folder, freelancer_id)
        emb = np.load(os.path.join(folder, "embedding.npy")).astype('float32')

        with open(os.path.join(folder, "metadata.json"), "r") as f:
            metadata = json.load(f)

        embeddings.append(emb)
        metadata_list.append({
            "freelancer_id": freelancer_id,
            "metadata": metadata
        })

    embeddings_np = np.vstack(embeddings).astype('float32')
    faiss.normalize_L2(embeddings_np)

    index = faiss.IndexFlatIP(embeddings_np.shape[1])
    index.add(embeddings_np)

    return index, metadata_list

def search_faiss(query_text, embedding_model, index, metadata_list, top_k=10):
    query_vec = embedding_model.encode([query_text]).astype('float32')
    faiss.normalize_L2(query_vec)

    D, I = index.search(query_vec, top_k)

    results = []
    for idx, score in zip(I[0], D[0]):
        if idx == -1:
            continue
        results.append({
            "freelancer_id": metadata_list[idx]["freelancer_id"],
            "similarity": float(score),
            "metadata": metadata_list[idx]["metadata"]
        })

    return results
