import React, { useState } from "react";
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { postsService } from "../../services/posts";

import PostForm from "./PostForm";
import PostCard from "./PostCard";
import Loading from "../Common/Loading";

const Feed = () => {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);

    const { data: response, isLoading, error } = useQuery({
        queryKey: ["feed", page],
        queryFn: () => postsService.getFeed(page, 10),
    });

    const loadMore = () => {
        if (pagination && pagination.page < pagination.pages) {
            setPage((previousPage) => previousPage + 1);
        }
    };

    const createMutation = useMutation({
        mutationFn: (data) => postsService.createPost(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["feed"] });
            toast.success("Post created successfully");
        },
        onError: (error) => {
            console.error("Create post error:", error);
            toast.error(error.response?.data?.message || "Failed to create post");
        }
    });

    const likeMutation = useMutation({
        mutationFn: postsService.likePost,
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: ["feed"] }),
        onError: (error) => {
            toast.error(error.response?.data?.message || "Failed to like post");
        }
    });

    const commentMutation = useMutation({
        mutationFn: ({ postId, text }) =>
            postsService.commentPost(postId, text),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: ["feed"] }),
        onError: (error) => {
            toast.error(error.response?.data?.message || "Failed to add comment");
        }
    });

    if (isLoading) return <Loading />;

    if (error) {
        console.error("Feed error:", error);
        return <h1 className="text-center text-red-500 py-8">Error loading feed</h1>;
    }

    // Extract posts from nested response
    const posts = response?.data?.data?.data || response?.data?.data || [];
    const pagination = response?.data?.data?.pagination || response?.data?.pagination;
    const hasMore = pagination?.hasNext || (pagination?.page < pagination?.pages);

    return (
        <div className="space-y-6">
            <PostForm
                onSubmit={async (data) => {
                    await createMutation.mutateAsync(data)
                }}
            />

            {posts.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">
                    <p>No posts to show</p>
                    <p className="text-sm mt-2">Create your first post or connect with other developers!</p>
                </div>
            ) : (
                <>
                    {posts.map((post) => (
                        <PostCard
                            key={post._id}
                            post={post}
                            onLike={() => likeMutation.mutate(post._id)}
                            onComment={(text) =>
                                commentMutation.mutate({
                                    postId: post._id,
                                    text,
                                })
                            }
                        />
                    ))}

                    {/* Load More Button */}
                    {hasMore && (
                        <div className="flex justify-center pt-4">
                            <button
                                onClick={loadMore}
                                className="btn-secondary px-6 py-2"
                            >
                                Load More
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Feed;