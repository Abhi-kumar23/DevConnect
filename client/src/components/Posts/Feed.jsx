import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { postsService } from "../../services/posts";

import PostForm from "./PostForm";
import PostCard from "./PostCard";
import Loading from "../Common/Loading";

const Feed = () => {
    const queryClient = useQueryClient();

    const page = 1;

    const { data: response, isLoading, error } = useQuery({
        queryKey: ["feed", page],
        queryFn: () => postsService.getFeed(page),
    });

    const createMutation = useMutation({
        mutationFn: postsService.createPost,
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: ["feed"] }),
    });

    const likeMutation = useMutation({
        mutationFn: postsService.likePost,
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: ["feed"] }),
    });

    const commentMutation = useMutation({
        mutationFn: ({ postId, text }) =>
            postsService.commentPost(postId, text),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: ["feed"] }),
    });

    if (isLoading) return <Loading />;

    if (error) {
        console.error("Feed error:", error);
        return <h1>Error loading feed</h1>;
    }

    // Extract posts from the nested response structure
    const posts = response?.data?.data?.data || response?.data?.data || [];
    
    console.log("Posts to display:", posts);

    console.log("First post structure:", JSON.stringify(posts[0], null, 2));

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
                posts.map((post) => (
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
                ))
            )}
        </div>
    );
};

export default Feed;