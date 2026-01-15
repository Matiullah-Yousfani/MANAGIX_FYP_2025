import os
from dotenv import load_dotenv
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
import math
from flashrank import Ranker, RerankRequest
import math

# Load ENV
load_dotenv()

EMBEDDING_FUNCTION = HuggingFaceEmbeddings(
    model_name="all-MiniLM-L6-v2"
)

VECTOR_FOLDER = os.getenv("VECTOR_FOLDER_PATH")
if not VECTOR_FOLDER:
    raise ValueError("VECTOR_FOLDER_PATH not found in .env!")

LEN_OF_CHUNKS = 10  # Top K from FAISS

def load_faiss_collections(collection_list, return_as_retriever=True):
    vector_stores = []
    for collection in collection_list:
        path = os.path.join(VECTOR_FOLDER, collection)
        if not os.path.exists(path):
            raise ValueError(f"Collection '{collection}' not found in {VECTOR_FOLDER}")
        vs = FAISS.load_local(
            path,
            EMBEDDING_FUNCTION,
            allow_dangerous_deserialization=True
        )
        if return_as_retriever:
            retriever = vs.as_retriever(
                search_kwargs={"k": LEN_OF_CHUNKS, "include_metadata": True}
            )
            vector_stores.append(retriever)
        else:
            vector_stores.append(vs)
    return vector_stores

def merge_freelancer_vectors(collection_list):
    if len(collection_list) == 1:
        retrievers = load_faiss_collections(collection_list, return_as_retriever=True)
        return retrievers[0]
    else:
        vectorstores = load_faiss_collections(collection_list, return_as_retriever=False)
        merged = vectorstores[0]
        for vs in vectorstores[1:]:
            merged.merge_from(vs)
        return merged.as_retriever(
            search_kwargs={"k": LEN_OF_CHUNKS * 2, "include_metadata": True}
        )
def rerank_with_flashrank(query, docs):
    if not docs:
        return []

    ranker = Ranker(model_name="ms-marco-MiniLM-L-12-v2")

    passages = [{"text": doc.page_content} for doc in docs]

    req = RerankRequest(query=query, passages=passages)

    scores = ranker.rerank(req)  # Returns list of dicts: [{'score': float}, ...]

    reranked_results = []

    for score_dict, doc in zip(scores, docs):
        score = score_dict.get("score", None)
        if score is not None and not math.isnan(score):
            reranked_results.append({
                "score": score,
                "meta": doc.metadata,
                "text": doc.page_content
            })

    reranked_results.sort(key=lambda x: x["score"], reverse=True)

    return reranked_results


def recommend_freelancers(project_summary, collection_list, top_n=10):
    if not isinstance(project_summary, str):
        raise ValueError("project_summary must be a string")
    project_summary = project_summary.strip()
    if not project_summary:
        raise ValueError("project_summary is empty")

    retriever = merge_freelancer_vectors(collection_list)
    initial_docs = retriever.invoke(project_summary)

    reranked = rerank_with_flashrank(project_summary, initial_docs)

    top_freelancers = []
    for res in reranked[:top_n]:
        meta = res["meta"]
        
        # Filter out freelancers who are not available
        availability = meta.get("availability")
        if availability != "Available":
            continue
            
        top_freelancers.append({
            "name": meta.get("name"),
            "skills": meta.get("skills", []),
            "summary": meta.get("summary"),
            "freelancer_id": meta.get("freelancer_id", "Unknown"),
            "score": res["score"],
            "availability": availability
        })
    return top_freelancers

if __name__ == "__main__":
    project_summary = """
    We need a Python developer experienced in FastAPI, AWS Lambda, and scraping pipelines.
    Someone who can deploy REST APIs and handle cloud deployment is preferred.
    """

    collection_list = os.listdir(VECTOR_FOLDER)
    print(f"Collections found: {collection_list}")

    results = recommend_freelancers(project_summary, collection_list)

    print("\nTop Freelancers Recommended (After Reranking):\n")
    for idx, r in enumerate(results, 1):
        print(f"{idx}. {r['name']} (ID: {r['freelancer_id']})")
        print(f"   Summary: {r['summary']}")
        print(f"   Skills: {', '.join(r['skills'])}")
        print("------")
